<script setup lang="ts">
import { computed } from "vue";

interface ShoeCardProps {
  imgURL: {
    thumbnail: string;
    bigShoe: string;
  };
  changeBigShoeImage: (shoe: string) => void;
  bigShoeImg: string;
}

const props = defineProps<ShoeCardProps>();

const handleClick = () => {
  if (props.bigShoeImg !== props.imgURL.bigShoe) {
    props.changeBigShoeImage(props.imgURL.bigShoe);
  }
};

const borderClass = computed(() =>
  props.bigShoeImg === props.imgURL.bigShoe ? "border-coral-red" : "border-transparent"
);
</script>

<template>
  <div
    :class="`border-2 rounded-xl cursor-pointer max-sm:flex-1 ${borderClass}`"
    @click="handleClick"
  >
    <div
      class="flex justify-center items-center bg-card bg-center bg-cover sm:w-40 sm:h-40 rounded-xl max-sm:p-4"
    >
      <img
        :src="imgURL.thumbnail"
        alt="shoe collection"
        width="127"
        height="103.34"
        class="object-contain"
      />
    </div>
  </div>
</template>
