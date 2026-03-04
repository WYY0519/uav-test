// store/modules/organization.js
import { defineStore } from "pinia";

export const useOrganizationStore = defineStore("organization", {
  state: () => ({
    currentOrgName: "", // 当前组织名称
    currentOrgId: "", // 当前组织ID
  }),
  actions: {
    setCurrentOrg(org) {
      console.log(org, "orgStore11111111111");
      // 新增：参数校验，避免org为undefined/null
      if (!org) {
        this.currentOrgName = "";
        this.currentOrgId = "";
        return;
      }
      this.currentOrgName = org.name || ""; // 增加默认值，防止name为空
      this.currentOrgId = org.organizationId || "";
    },
  },
});
