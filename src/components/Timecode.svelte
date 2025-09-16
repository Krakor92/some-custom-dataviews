<script lang="ts">
  import { convertDurationToTimecode } from "@/utils";

  const { duration }: { duration: number } = $props();
</script>

<div class="timecode">
  <span>{convertDurationToTimecode(duration)}</span>
</div>

<style>
  .timecode {
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;

    z-index: 10;
    grid-column: 1;
    grid-row: 1;
    align-self: flex-end;
    justify-self: end;

    border-radius: 5px;
    padding: 0 4px;
    margin: 2px;

    /* To add a little space when the thumbnail image is disabled */
    /* margin-top: 28px; */

    span {
      color: #eff1f5;
      display: inline-block;
      font-size: 0.8em;
      font-weight: 600;
    }
  }
</style>
