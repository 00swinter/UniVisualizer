<script lang="ts">
	import OperatorBase from './OperatorBase.svelte';
	import { PixelBuffer } from '$lib/classes/PixelBuffer';

	interface Props {
		input: PixelBuffer | null;
		output?: PixelBuffer | null;
		enabled?: boolean;
	}

	let { input, output = $bindable(null), enabled = $bindable(true) }: Props = $props();

	function onReset() {}

	$effect(() => {
		if (!input) {
			output = null;
			return;
		}
		if (!enabled) {
			output = input;
			return;
		}
		const nextOutput = new PixelBuffer(input.width, input.height);

		output = nextOutput;
	});
</script>

<OperatorBase title="template" icon="settings" bind:enabled {onReset}>
	
</OperatorBase>
