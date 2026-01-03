<template>
  <div class="mb-6">
    <a-checkbox-group v-model:value="selectedFeatures" style="width: 100%">
      <a-row>
        <a-col class="my-2 mx-1" :span="8">
          <a-checkbox value="White">White</a-checkbox>
        </a-col>
        <a-col class="my-2 mx-1" :span="8">
          <a-checkbox value="Blue Cart">Blue Cart</a-checkbox>
        </a-col>
        <a-col class="my-2 mx-1" :span="8">
          <a-checkbox value="Photosun">Photosun (+300৳)</a-checkbox>
        </a-col>
      </a-row>
    </a-checkbox-group>
  </div>

  <p class="my-4 text-gray-700 font-semibold">Upload Your Prescription</p>
  <a-upload
    v-model:file-list="fileList"
    name="file"
    :custom-request="dummyUploadRequest"
    :headers="headers"
    @change="handleChange"
  >
    <a-button>
      <upload-outlined></upload-outlined>
      Upload Image
    </a-button>
  </a-upload>

  <!-- Lens Package -->
  <div class="container mx-auto">
    <div class="flex flex-wrap items-center justify-center w-full text-center">
      <div
        v-for="(plan, index) in plans"
        :key="plan.name"
        class="w-full p-4 md:w-1/2 lg:w-1/3"
      >
        <div
          class="flex flex-col rounded border-2 transition-all duration-300 cursor-pointer"
          :class="{
            'bg-blue-700 border-blue-700 text-white':
              selectedPlanIndex === index,
            'bg-white border-blue-700 text-blue-700':
              selectedPlanIndex !== index,
          }"
          @click="selectPlan(index)"
        >
          <div
            class="py-5 rounded-t"
            :class="
              selectedPlanIndex === index
                ? 'bg-blue-700 text-white'
                : 'bg-white text-blue-700'
            "
          >
            <h3 class="text-xl font-bold">{{ plan.name }}</h3>
            <p class="text-5xl font-bold">
              ৳{{ plan.price }}.<span class="text-3xl">00</span>
            </p>
            <p class="text-xs uppercase">{{ plan.subtitle }}</p>
          </div>
          <div
            class="py-5 rounded-b"
            :class="
              selectedPlanIndex === index
                ? 'bg-blue-700 text-white'
                : 'bg-white text-blue-700'
            "
          >
            <p v-for="(feature, i) in plan.features" :key="i">
              ✔︎ {{ feature }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from "vue";
import { message } from "ant-design-vue";
import { UploadOutlined } from "@ant-design/icons-vue";
import type { UploadChangeParam, UploadProps } from "ant-design-vue";

// Define props with explicit types
interface LensPackage {
  name: string;
  price: number;
  subtitle: string;
  features: string[];
}

const props = defineProps<{
  package: LensPackage | null;
  features: string[];
  prescription: string | null;
}>();

const emit = defineEmits<{
  (e: "update:package", value: LensPackage | null): void;
  (e: "update:features", value: string[]): void;
  (e: "update:prescription", value: string | null): void;
}>();

const selectedPlanIndex = ref<number | null>(null);
const fileList = ref<UploadProps["fileList"]>([]);
const headers = { authorization: "authorization-text" };

// Create computed properties for two-way binding
const selectedPackage = computed({
  get: () => props.package,
  set: (value) => emit("update:package", value),
});

const selectedFeatures = computed({
  get: () => props.features,
  set: (value) => emit("update:features", value),
});

const prescriptionImage = computed({
  get: () => props.prescription,
  set: (value) => emit("update:prescription", value),
});

const plans: LensPackage[] = [
  {
    name: "Basic",
    price: 700,
    subtitle: "Thin lens basic package",
    features: ["1.5 Index Basic Lenses"],
  },
  {
    name: "Standard",
    price: 1500,
    subtitle: "Protected With Three Coating",
    features: [
      "1.5 Index Basic Lenses",
      "Scratch Resistant Coating",
      "Anti Reflective Coating",
    ],
  },
  {
    name: "Premium",
    price: 2000,
    subtitle: "Most complete package",
    features: [
      "1.67 Index Super Thin Lenses",
      "Scratch Resistant Coating",
      "UV Protective Coating",
      "Premium Anti-Reflective Coating",
    ],
  },
];

const selectPlan = (index: number) => {
  selectedPlanIndex.value = index;
  selectedPackage.value = plans[index];
};

// Dummy upload handler
const dummyUploadRequest = (options: any) => {
  setTimeout(() => {
    options.onSuccess();
  }, 1000);
};

// Handle file upload
const handleChange = (info: UploadChangeParam) => {
  if (info.file.status === "done") {
    message.success(`${info.file.name} file uploaded successfully`);

    // Read file as data URL
    const file = info.file.originFileObj;
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          prescriptionImage.value = e.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  } else if (info.file.status === "error") {
    message.error(`${info.file.name} file upload failed.`);
  } else if (info.file.status === "removed") {
    prescriptionImage.value = null;
  }
};
</script>
