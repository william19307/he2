<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">医疗转介</h2>
      <p class="page-desc">记录需要转介到专业医疗机构的学生信息</p>
    </div>

    <a-card :bordered="false" class="table-card">
      <a-table :data="[]" :pagination="false" row-key="id">
        <template #columns>
          <a-table-column title="学生姓名" :width="120" />
          <a-table-column title="班级" :width="160" />
          <a-table-column title="转介时间" :width="180" />
          <a-table-column title="转介机构" />
          <a-table-column title="状态" :width="100" />
          <a-table-column title="操作" :width="120" fixed="right" />
        </template>
        <template #empty>
          <a-empty description="暂无转介记录">
            <a-button type="primary" class="create-btn" @click="onCreateClick">新建转介记录</a-button>
          </a-empty>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
function onCreateClick() {
  /* 新建转介记录：功能待实现 */
}
</script>

<style scoped>
.page-wrap {
  padding: 20px 24px 32px;
  min-height: 100%;
  box-sizing: border-box;
}
.page-header {
  margin-bottom: 20px;
}
.page-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
}
.page-desc {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-3);
}
.table-card {
  border-radius: 8px;
}
.create-btn {
  margin-top: 8px;
}
</style>
