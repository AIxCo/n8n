<script setup lang="ts">
/* eslint-disable vue/no-multiple-template-root */
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import { getMidCanvasPosition } from '@/utils/nodeViewUtils';
import {
	DEFAULT_STICKY_HEIGHT,
	DEFAULT_STICKY_WIDTH,
	NODE_CREATOR_OPEN_SOURCES,
	STICKY_NODE_TYPE,
} from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import type { AddedNodesAndConnections, ToggleNodeCreatorOptions } from '@/Interface';
import { useActions } from './NodeCreator/composables/useActions';
import { useThrottleFn } from '@vueuse/core';
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import { useI18n } from '@/composables/useI18n';

type Props = {
	nodeViewScale: number;
	createNodeActive?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const LazyNodeCreator = defineAsyncComponent(
	async () => await import('@/components/Node/NodeCreator/NodeCreator.vue'),
);

const props = withDefaults(defineProps<Props>(), {
	createNodeActive: false, // Determines if the node creator is open
});

const emit = defineEmits<{
	addNodes: [value: AddedNodesAndConnections];
	toggleNodeCreator: [value: ToggleNodeCreatorOptions];
}>();

const uiStore = useUIStore();
const i18n = useI18n();

const { getAddedNodesAndConnections } = useActions();

const wrapperRef = ref<HTMLElement | undefined>();
const wrapperBoundingRect = ref<DOMRect | undefined>();
const isStickyNotesButtonVisible = ref(true);

const isChatOpen = ref(false);
const messages = ref([{ role: 'assistant', content: 'Hello! How can I help you today?' }]);
const newMessage = ref('');

const onMouseMove = useThrottleFn((event: MouseEvent) => {
	if (wrapperBoundingRect.value) {
		const offset = 100;
		isStickyNotesButtonVisible.value =
			event.clientX >= wrapperBoundingRect.value.left - offset &&
			event.clientX <= wrapperBoundingRect.value.right + offset &&
			event.clientY >= wrapperBoundingRect.value.top - offset &&
			event.clientY <= wrapperBoundingRect.value.bottom + offset;
	} else {
		isStickyNotesButtonVisible.value = true;
	}
}, 250);

function openNodeCreator() {
	emit('toggleNodeCreator', {
		source: NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
		createNodeActive: true,
	});
}

function addStickyNote() {
	if (document.activeElement) {
		(document.activeElement as HTMLElement).blur();
	}

	const offset: [number, number] = [...uiStore.nodeViewOffsetPosition];

	const position = getMidCanvasPosition(props.nodeViewScale, offset);
	position[0] -= DEFAULT_STICKY_WIDTH / 2;
	position[1] -= DEFAULT_STICKY_HEIGHT / 2;

	emit('addNodes', getAddedNodesAndConnections([{ type: STICKY_NODE_TYPE, position }]));
}

function closeNodeCreator(hasAddedNodes = false) {
	if (props.createNodeActive) {
		emit('toggleNodeCreator', { createNodeActive: false, hasAddedNodes });
	}
}

function nodeTypeSelected(nodeTypes: string[]) {
	emit('addNodes', getAddedNodesAndConnections(nodeTypes.map((type) => ({ type }))));
	closeNodeCreator(true);
}

function toggleChat() {
	isChatOpen.value = !isChatOpen.value;
}

function sendMessage() {
	if (!newMessage.value.trim()) return;

	messages.value.push({ role: 'user', content: newMessage.value });

	// Simulate AI response (we'll replace this with actual API call later)
	setTimeout(() => {
		messages.value.push({
			role: 'assistant',
			content: `This is a mock response to: ${newMessage.value}`,
		});
	}, 1000);

	newMessage.value = '';
}

onMounted(() => {
	wrapperBoundingRect.value = wrapperRef.value?.getBoundingClientRect();

	document.addEventListener('mousemove', onMouseMove);
});

onBeforeUnmount(() => {
	document.removeEventListener('mousemove', onMouseMove);
});
</script>

<template>
	<div v-if="!createNodeActive" :class="$style.nodeButtonsWrapper">
		<div :class="$style.nodeCreatorButton" ref="wrapperRef" data-test-id="node-creator-plus-button">
			<KeyboardShortcutTooltip
				:label="i18n.baseText('nodeView.openNodesPanel')"
				:shortcut="{ keys: ['Tab'] }"
				placement="left"
			>
				<n8n-icon-button
					size="large"
					icon="plus"
					type="tertiary"
					:class="$style.nodeCreatorPlus"
					@click="openNodeCreator"
				/>
			</KeyboardShortcutTooltip>
			<div
				:class="[$style.addStickyButton, isStickyNotesButtonVisible ? $style.visibleButton : '']"
				data-test-id="add-sticky-button"
				@click="addStickyNote"
			>
				<KeyboardShortcutTooltip
					:label="i18n.baseText('nodeView.addStickyHint')"
					:shortcut="{ keys: ['s'], shiftKey: true }"
					placement="left"
				>
					<n8n-icon-button type="tertiary" :icon="['far', 'note-sticky']" />
				</KeyboardShortcutTooltip>
			</div>
		</div>
	</div>
	<Suspense>
		<LazyNodeCreator
			:active="createNodeActive"
			@node-type-selected="nodeTypeSelected"
			@close-node-creator="closeNodeCreator"
		/>
	</Suspense>
</template>

<style lang="scss" module>
.nodeButtonsWrapper {
	position: absolute;
	top: 0;
	right: 0;
	display: flex;
}

.addStickyButton {
	margin-top: var(--spacing-2xs);
	opacity: 0;
	transition: 0.1s;
	transition-timing-function: linear;
}

.visibleButton {
	opacity: 1;
	pointer-events: all;
}

.noEvents {
	pointer-events: none;
}

.nodeCreatorButton {
	position: absolute;
	text-align: center;
	top: var(--spacing-s);
	right: var(--spacing-s);
	pointer-events: all !important;
}
.nodeCreatorPlus {
	width: 36px;
	height: 36px;
}

.aiChatButton {
	margin-top: var(--spacing-2xs);
	opacity: 0;
	transition: 0.1s;
	transition-timing-function: linear;
}

.chatInterface {
	position: fixed;
	right: var(--spacing-s);
	top: var(--spacing-xl);
	width: 300px;
	height: 500px;
	background: var(--color-background-xlight);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-large);
	display: flex;
	flex-direction: column;
	z-index: 999;
}

.chatHeader {
	padding: var(--spacing-2xs) var(--spacing-s);
	border-bottom: 1px solid var(--color-foreground-base);
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.chatMessages {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing-s);
}

.message {
	margin-bottom: var(--spacing-2xs);
	padding: var(--spacing-2xs) var(--spacing-s);
	border-radius: var(--border-radius-base);
	max-width: 80%;
}

.assistant {
	background: var(--color-background-light);
	align-self: flex-start;
}

.user {
	background: var(--color-primary-tint-3);
	margin-left: auto;
}

.chatInput {
	padding: var(--spacing-2xs);
	border-top: 1px solid var(--color-foreground-base);
	display: flex;
	gap: var(--spacing-2xs);
}
</style>
