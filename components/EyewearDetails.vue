<template>
    <a-card class="p-6">
      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="details" tab="Details">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Frame Measurements -->
            <div>
              <h3 class="font-semibold text-lg">Frame Measurements</h3>
              <ul class="text-gray-600">
                <li>Frame Width: {{ frameWidth }} mm</li>
                <li>Bridge: {{ bridge }} mm</li>
                <li>Lens Width: {{ lensWidth }} mm</li>
                <li>Lens Height: {{ lensHeight }} mm</li>
                <li>Temple Length: {{ templeLength }} mm</li>
              </ul>
            </div>
  
            <!-- Frame Details -->
            <div>
              <h3 class="font-semibold text-lg">Frame Details</h3>
              <ul class="text-gray-600">
                <li>Size: {{ size }}</li>
                <li>Material: {{ material }}</li>
                <li>Weight: {{ weight }}</li>
                <li>Shape: {{ shape }}</li>
                <li>Feature: {{ feature }}</li>
              </ul>
            </div>
          </div>
        </a-tab-pane>
  
        <a-tab-pane key="prescription" tab="Prescription Details">
          <div>
            <h3 class="font-semibold text-lg">Prescription Range</h3>
            <p class="text-gray-600">PD Range: {{ pdRange }} mm</p>
            <p class="text-gray-600">Prescription Range: {{ prescriptionRange }}</p>
            <p class="text-gray-600">Available as Readers: {{ availableAsReaders ? "Yes" : "No" }}</p>
            <p class="text-gray-600">Available as Progressive/Bifocal: {{ availableAsProgressive ? "Yes" : "No" }}</p>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </template>
  
  <script setup>
  import { ref, defineProps } from 'vue';
  
  const activeTab = ref('details');
  
  defineProps({
    frameWidth: Number,
    bridge: Number,
    lensWidth: Number,
    lensHeight: Number,
    templeLength: Number,
    size: String,
    material: String,
    weight: String,
    shape: String,
    feature: String,
    pdRange: String,
    prescriptionRange: String,
    availableAsReaders: Boolean,
    availableAsProgressive: Boolean,
  });
  </script>
  
  