<script>
	import OperatorBase from './OperatorBase.svelte';
	import { PixelBuffer } from '$lib/classes/PixelBuffer';


	let { input, output = $bindable(), enabled = $bindable(true) } = $props();

	function onReset() {
		
	}

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
