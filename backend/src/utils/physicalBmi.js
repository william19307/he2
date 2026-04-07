/**
 * 儿童青少年 BMI（中国标准，new-features.md §4.2）
 */
export function computeBmi(heightCm, weightKg) {
  const h = Number(heightCm);
  const w = Number(weightKg);
  if (!h || !w || h <= 0 || w <= 0) {
    return { bmi: null, bmi_status: null };
  }
  const hM = h / 100;
  const raw = w / (hM * hM);
  const bmi = Math.round(raw * 10) / 10;
  let bmi_status = '正常';
  if (raw < 15) bmi_status = '偏瘦';
  else if (raw < 23) bmi_status = '正常';
  else if (raw < 27.5) bmi_status = '超重';
  else bmi_status = '肥胖';
  return { bmi, bmi_status };
}
