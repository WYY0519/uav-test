// store/modules/project.js
import { defineStore } from "pinia";

export const useProjectStore = defineStore("project", {
  state: () => ({
    selectedProject: null, // 存储选中的项目
    selectedProjectId: "",
    selectedProjectName: "",
  }),

  actions: {
    setSelectedProject(project) {
      this.selectedProject = project;
      this.selectedProjectId = project.projectId;
      this.selectedProjectName = project.name;
    },

    clearSelectedProject() {
      this.selectedProject = null;
      this.selectedProjectId = "";
      this.selectedProjectName = "";
    },
  },
});
