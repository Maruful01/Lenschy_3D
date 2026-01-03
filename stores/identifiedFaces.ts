// identifiedFaces.ts
import { defineStore } from "pinia";

export interface FaceData {
  shape: string;
  img: string; // This will be a Base64 string of the image
  pd: string;
  gender: number;
  ageCategory: string;
  frameWidth: string;
  lensHeight: string;
  bridge: string;
  recommendedFrames: string;
  recommendationSummary: string;
  email: string;
  apiCalles: number;
}

export const useIdentifiedFacesStore = defineStore("identifiedFaces", {
  state: () => ({
    faceDataList: [] as FaceData[],
  }),

  actions: {
    // Action to load data from localStorage
    loadFromLocal() {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("face-data-list");
        if (raw) {
          try {
            this.faceDataList = JSON.parse(raw);
          } catch (err) {
            console.error("Failed to parse face data from localStorage:", err);
            this.faceDataList = [];
          }
        }
      }
    },

    // Action to save data to localStorage
    saveToLocal() {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "face-data-list",
          JSON.stringify(this.faceDataList)
        );
      }
    },

    getUserData(email: string): FaceData | undefined {
      return this.faceDataList.find((d) => d.email === email);
    },

    canAddOrUpdate(email: string) {
      const existing = this.getUserData(email);
      if (existing) return existing.apiCalles < 10;
      return this.faceDataList.length < 3;
    },

    updateOrAddFaceData(newData: Omit<FaceData, "apiCalles">) {
      const index = this.faceDataList.findIndex(
        (d) => d.email === newData.email
      );
      if (index !== -1) {
        const current = this.faceDataList[index];
        if (current.apiCalles >= 10) {
          console.warn("API call limit reached for this user.");
          return false;
        }

        const updatedData = { ...newData, apiCalles: current.apiCalles + 1 };
        this.faceDataList.splice(index, 1, updatedData);
      } else {
        if (this.faceDataList.length >= 3) {
          console.warn("Max user limit reached in the store.");
          return false;
        }

        this.faceDataList.push({ ...newData, apiCalles: 1 });
      }

      // Call saveToLocal after every successful state change
      this.saveToLocal();
      return true;
    },

    deleteUserData(email: string) {
      const index = this.faceDataList.findIndex((d) => d.email === email);
      if (index !== -1) {
        this.faceDataList.splice(index, 1);
        // Call saveToLocal after deleting an item
        this.saveToLocal();
      }
    },
  },
});
