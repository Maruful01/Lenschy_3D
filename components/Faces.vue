<script setup lang="ts">
import { useIdentifiedFacesStore } from "@/stores/identifiedFaces";
import { onMounted, computed } from "vue";

const identifiedFacesStore = useIdentifiedFacesStore();
const { user, isLoaded } = useUser();

onMounted(() => {
  identifiedFacesStore.loadFromLocal();
});

// A reactive computed property for the full list (for debugging)
const allFaceData = computed(() => identifiedFacesStore.faceDataList);

// Get the current user's email from the auth service
const currentUserEmail = computed(
  () => user.value?.primaryEmailAddress?.emailAddress
);

// Use a computed property to get data for the logged-in user
const currentUserFaceData = computed(() => {
  if (!isLoaded.value || !currentUserEmail.value) {
    return null;
  }
  return identifiedFacesStore.getUserData(currentUserEmail.value);
});

// A computed property to format the Base64 image string for display
const currentFaceImageUrl = computed(() => {
  if (currentUserFaceData.value?.img) {
    // The image data starts with "iVBORw0...", which is a PNG.
    // We prefix it with the correct data URL header.
    return `data:image/png;base64,${currentUserFaceData.value.img}`;
  }
  return null;
});

const print = () => {
  console.log("Face Data", allFaceData.value);
  console.log("Current User Data:", currentUserFaceData.value);
};
</script>

<template>
  <div class="text-black p-4">
    <h2>Your Face Analysis</h2>
    <hr class="my-4" />

    <div v-if="currentUserFaceData">
      <h3 class="text-xl font-semibold mb-4">Your Last Analysis</h3>

      <div v-if="currentFaceImageUrl" class="mb-4">
        <img
          :src="currentFaceImageUrl"
          alt="Analyzed Face"
          class="max-w-xs rounded-lg shadow-md"
        />
      </div>

      <p><strong>Face Shape:</strong> {{ currentUserFaceData.shape }}</p>
      <p>
        <strong>Gender:</strong>
        {{ currentUserFaceData.gender === 1 ? "Male" : "Female" }}
      </p>
      <p>
        <strong>Age Category:</strong> {{ currentUserFaceData.ageCategory }}
      </p>
      <p>
        <strong>Pupillary Distance (PD):</strong> {{ currentUserFaceData.pd }}
      </p>
      <p><strong>Frame Width:</strong> {{ currentUserFaceData.frameWidth }}</p>
      <p><strong>Lens Height:</strong> {{ currentUserFaceData.lensHeight }}</p>
      <p>
        <strong>Recommended Frames:</strong>
        {{ currentUserFaceData.recommendedFrames }}
      </p>
      <p>
        <strong>Summary:</strong>
        {{ currentUserFaceData.recommendationSummary }}
      </p>
    </div>

    <div v-else>
      <p class="text-gray-500">No face data found for you.</p>
    </div>

    <hr class="my-6" />

    <button
      @click="print"
      class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      Print to Console
    </button>

    <div class="mt-8">
      <h2 class="text-lg font-medium">All Identified Faces (for testing)</h2>
      <div
        v-for="face in allFaceData"
        :key="face.email"
        class="border-t mt-2 pt-2"
      >
        <p>Email: {{ face.email }}</p>
        <p>Face Shape: {{ face.shape }}</p>
        <p>API Calls: {{ face.apiCalles }}</p>
      </div>
    </div>
  </div>
</template>
