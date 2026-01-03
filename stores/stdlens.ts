import { defineStore } from "pinia";

interface LensFeature {
  id: string;
  name: string;
  price: number;
}

interface LensPackage {
  name: string;
  price: number;
  subtitle: string;
  features: string[];
}

interface StdLensState {
  selectedPackage: LensPackage | null;
  selectedFeatures: LensFeature[];
  prescriptionImage: string | null;
}

export const useStdLensStore = defineStore("stdlens", {
  state: (): StdLensState => ({
    selectedPackage: null,
    selectedFeatures: [],
    prescriptionImage: null,
  }),
  getters: {
    totalPrice(state): number {
      let total = state.selectedPackage?.price || 0;

      // Add extra cost for Photosun feature
      const photosunFeature = state.selectedFeatures.find((f) => f.id === "B");
      if (photosunFeature) {
        total += photosunFeature.price;
      }

      return total;
    },
    selectedFeatureNames(state): string[] {
      return state.selectedFeatures.map((f) => f.name);
    },
  },
  actions: {
    selectPackage(pkg: LensPackage) {
      this.selectedPackage = pkg;
      this.saveToLocal();
    },

    setFeatures(features: LensFeature[]) {
      this.selectedFeatures = features;
      this.saveToLocal();
    },

    setPrescription(image: string) {
      this.prescriptionImage = image;
      this.saveToLocal();
    },

    saveToLocal() {
      localStorage.setItem(
        "stdlens",
        JSON.stringify({
          selectedPackage: this.selectedPackage,
          selectedFeatures: this.selectedFeatures,
          prescriptionImage: this.prescriptionImage,
        })
      );
    },

    loadFromLocal() {
      const saved = localStorage.getItem("stdlens");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          this.selectedPackage = parsed.selectedPackage;
          this.selectedFeatures = parsed.selectedFeatures;
          this.prescriptionImage = parsed.prescriptionImage;
        } catch (error) {
          console.error(
            "Failed to parse stdlens data from localStorage",
            error
          );
        }
      }
    },
  },
});
