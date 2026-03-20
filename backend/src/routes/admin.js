import { Router } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import { authorize } from '../middleware/auth.js';
import { success } from '../utils/response.js';
import { ValidationError } from '../utils/errors.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const ROLE_LABELS = {
  admin: '管理员',
  counselor: '心理教师',
  teacher: '班主任',
  doctor: '校医',
  student: '学生',
  super_admin: '超级管理员',
};

function maskPhone(p) {
  if (!p || String(p).length < 7) return p || '';
  const s = String(p);
  return s.length >= 11 ? s.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2') : '****';
}

const router = Router();
router.use(authorize('admin'));

/** GET /api/v1/admin/users — §9.1 */
router.get('/users', async (req, res, next) => {
  try {
    const { role, status, keyword, page = 1, page_size = 20 } = req.query;
    const where = { tenantId: req.tenantId };
    if (role) where.role = role;
    if (status !== undefined && status !== '') where.status = Number(status);
    if (keyword) {
      where.OR = [
        { realName: { contains: String(keyword) } },
        { username: { contains: String(keyword) } },
      ];
    }
    const skip = (Number(page) - 1) * Number(page_size);
    const take = Number(page_size);
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'asc' },
        select: {
          id: true,
          username: true,
          realName: true,
          role: true,
          phone: true,
          status: true,
          lastLoginAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);
    const list = rows.map((u) => ({
      id: Number(u.id),
      username: u.username,
      real_name: u.realName,
      role: u.role,
      role_label: ROLE_LABELS[u.role] || u.role,
      phone: maskPhone(u.phone),
      status: u.status,
      status_label: u.status === 1 ? '正常' : '禁用',
      last_login_at: u.lastLoginAt?.toISOString?.() || null,
      class_names: [],
    }));
    success(res, { list, total });
  } catch (err) {
    next(err);
  }
});

function uploadSingleFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ValidationError('文件超过 5MB 限制'));
      }
      if (String(err.message || '').includes('Unexpected field')) {
        return next(
          new ValidationError('请使用表单字段名 file 上传（curl: -F "file=@xxx.xlsx"）')
        );
      }
      return next(err);
    }
    next();
  });
}

/** POST /api/v1/admin/students/import — CSV 或 xlsx，multipart 字段名必须为 file */
router.post('/students/import', uploadSingleFile, async (req, res, next) => {
  try {
    if (!req.file?.buffer) throw new ValidationError('请上传 file 字段');

    const name = (req.file.originalname || '').toLowerCase();
    const isXlsx = name.endsWith('.xlsx') || name.endsWith('.xls');
    let rows;
    if (!isXlsx) {
      const text = req.file.buffer.toString('utf8').replace(/^\uFEFF/, '');
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        return success(res, {
          total: 0,
          success: 0,
          failed: 0,
          errors: [],
          imported_count: 0,
          failed_count: 0,
          failed_rows: [],
        });
      }
      rows = lines.map((line) => {
        const p = [];
        let cur = '';
        let q = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"') q = !q;
          else if ((c === ',' && !q) || c === '\t') {
            p.push(cur.trim());
            cur = '';
          } else cur += c;
        }
        p.push(cur.trim());
        return p;
      });
    } else {
      let XLSX;
      try {
        XLSX = (await import('xlsx')).default;
      } catch {
        throw new ValidationError('请上传 .csv，或执行 npm install xlsx');
      }
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    }
    if (!rows || rows.length < 2) {
      return success(res, {
        total: 0,
        success: 0,
        failed: 0,
        errors: [],
        imported_count: 0,
        failed_count: 0,
        failed_rows: [],
      });
    }
    const header = rows[0].map((c) => String(c).trim());
    const col = (name, aliases) => {
      const i = header.findIndex((h) =>
        aliases.some((a) => h === a || h.includes(a))
      );
      return i >= 0 ? i : -1;
    };
    const iNo = col('学号', ['学号', 'student_no']);
    const iName = col('姓名', ['姓名', 'name']);
    const iClass = col('班级', ['班级', 'class']);
    const iGender = col('性别', ['性别', 'gender']);
    if (iNo < 0 || iName < 0 || iClass < 0) {
      throw new ValidationError('表头需包含：学号、姓名、班级名称');
    }

    const errors = [];
    let successN = 0;
    const hash = await bcrypt.hash('123456', 10);
    const tenantId = req.tenantId;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const student_no = String(row[iNo] ?? '').trim();
      const real_name = String(row[iName] ?? '').trim();
      const class_name = String(row[iClass] ?? '').trim();
      if (!student_no && !real_name) continue;
      const rowNum = r + 1;
      if (!student_no || !real_name || !class_name) {
        errors.push({ row: rowNum, student_no, reason: '学号/姓名/班级不能为空' });
        continue;
      }

      const cls = await prisma.class.findFirst({
        where: { tenantId, name: class_name },
      });
      if (!cls) {
        errors.push({ row: rowNum, student_no, reason: `班级不存在：${class_name}` });
        continue;
      }

      const dup = await prisma.student.findFirst({
        where: { tenantId, studentNo: student_no },
      });
      if (dup) {
        errors.push({ row: rowNum, student_no, reason: '学号重复' });
        continue;
      }

      let g = 2;
      if (iGender >= 0) {
        const gtxt = String(row[iGender] || '');
        if (gtxt.includes('男')) g = 1;
        else if (gtxt.includes('女')) g = 2;
      }

      const uname = `import_${student_no}`.slice(0, 30);
      const user = await prisma.user.create({
        data: {
          tenantId,
          username: uname,
          passwordHash: hash,
          realName: real_name,
          role: 'student',
          status: 1,
        },
      });
      await prisma.student.create({
        data: {
          tenantId,
          userId: user.id,
          studentNo: student_no,
          classId: cls.id,
          gender: g,
        },
      });
      successN += 1;
    }

    const totalRows = rows.length - 1;
    success(res, {
      total: totalRows,
      success: successN,
      failed: errors.length,
      errors,
      imported_count: successN,
      failed_count: errors.length,
      failed_rows: errors,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
