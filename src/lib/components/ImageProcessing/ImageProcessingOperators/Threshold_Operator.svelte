<script lang="ts">
  import OperatorBase from "./OperatorBase.svelte";
  import { PixelBuffer } from "$lib/classes/PixelBuffer";
  import Parameter from "$lib/components/Parameter.svelte";
  import RadioSelect from "$lib/components/RadioSelect.svelte";
  import OptionCheckbox from "$lib/components/OptionCheckbox.svelte";
  import InfoContainer from "$lib/components/Info_Container.svelte";
  import { Colors } from "$lib/classes/Colors";

  type ChannelMode = "luminance" | "all" | "separated";

  interface Props {
    input: PixelBuffer | null;
    output?: PixelBuffer | null;
    enabled?: boolean;
  }

  let {
    input,
    output = $bindable(null),
    enabled = $bindable(true),
  }: Props = $props();

  let channelMode = $state<ChannelMode>("luminance");
  let invert = $state(false);

  let threshold = $state(128);
  let thresholdR = $state(128);
  let thresholdG = $state(128);
  let thresholdB = $state(128);

  function onReset() {
    channelMode = "luminance";
    invert = false;
    threshold = 128;
    thresholdR = 128;
    thresholdG = 128;
    thresholdB = 128;
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

    const src = input.data;
    const nextOutput = new PixelBuffer(input.width, input.height);
    const dst = nextOutput.data;
    const flip = invert;

    const thresh = (value: number, cutoff: number) => {
      const above = value >= cutoff;
      return flip ? (above ? 0 : 255) : above ? 255 : 0;
    };

    if (channelMode === "luminance") {
      const cutoff = threshold;
      for (let i = 0; i < src.length; i += 4) {
        const gray = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        const val = thresh(gray, cutoff);
        dst[i] = val;
        dst[i + 1] = val;
        dst[i + 2] = val;
        dst[i + 3] = src[i + 3];
      }
    } else if (channelMode === "all") {
      const cutoff = threshold;
      for (let i = 0; i < src.length; i += 4) {
        dst[i] = thresh(src[i], cutoff);
        dst[i + 1] = thresh(src[i + 1], cutoff);
        dst[i + 2] = thresh(src[i + 2], cutoff);
        dst[i + 3] = src[i + 3];
      }
    } else {
      const cutR = thresholdR;
      const cutG = thresholdG;
      const cutB = thresholdB;
      for (let i = 0; i < src.length; i += 4) {
        dst[i] = thresh(src[i], cutR);
        dst[i + 1] = thresh(src[i + 1], cutG);
        dst[i + 2] = thresh(src[i + 2], cutB);
        dst[i + 3] = src[i + 3];
      }
    }

    output = nextOutput;
  });
</script>

<OperatorBase title="Threshold" icon="tonality" bind:enabled {onReset}>
  <div class="controls">
    <RadioSelect
      options={[
        { label: "Luminance", value: "luminance" },
        { label: "All Channels", value: "all" },
        { label: "Separate", value: "separated" },
      ]}
      bind:value={channelMode}
    />

    {#if channelMode === "separated"}
      <Parameter
        type="range"
        label="Red"
        bind:value={thresholdR}
        min={0}
        max={255}
        step={1}
        color={Colors.red()}
      />
      <Parameter
        type="range"
        label="Green"
        bind:value={thresholdG}
        min={0}
        max={255}
        step={1}
        color={Colors.green()}
      />
      <Parameter
        type="range"
        label="Blue"
        bind:value={thresholdB}
        min={0}
        max={255}
        step={1}
        color={Colors.blue()}
      />
    {:else}
      <Parameter
        type="range"
        label="Cutoff"
        bind:value={threshold}
        min={0}
        max={255}
        step={1}
        color={channelMode === "luminance"
          ? Colors.gray_white()
          : Colors.yellow()}
      />
    {/if}

    <OptionCheckbox label="Invert" bind:checked={invert} />
  </div>

  {#if channelMode === "luminance"}
    <InfoContainer title="Luminance Threshold">
      <p>
        Uses Rec. 601 luminance (0.299R + 0.587G + 0.114B). Pixels at or above
        the cutoff become white; darker pixels become black{invert
          ? " (inverted)"
          : ""}.
      </p>
    </InfoContainer>
  {:else if channelMode === "all"}
    <InfoContainer title="Per-Channel Threshold">
      <p>
        Applies the same cutoff to R, G, and B independently. The result stays a
        color image where each channel is binary{invert ? " (inverted)" : ""}.
      </p>
    </InfoContainer>
  {:else}
    <InfoContainer title="Separate Channel Thresholds">
      <p>
        Each channel has its own cutoff. Useful for color-based segmentation
        when red, green, and blue need different thresholds{invert
          ? " (inverted)"
          : ""}.
      </p>
    </InfoContainer>
  {/if}
</OperatorBase>

<style>
  .controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 10px;
  }
</style>
