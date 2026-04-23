<script lang="ts">
    /** @typedef {{ columns: string[], rows: Record<string, number>[] }} TruthTableData */
    
    // Svelte 5 uses the $props rune for component inputs
    let { data }: { data: TruthTableData } = $props();
</script>

{#if data?.columns?.length > 0}
    <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    {#each data.columns as column}
                        <th>{column}</th>
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each data.rows as row}
                    <tr>
                        {#each data.columns as column}
                            <td>
                                <span 
                                    class:bit_zero={row[column] === 0} 
                                    class:bit_one={row[column] === 1}
                                >
                                    {row[column]}
                                </span>
                            </td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{/if}

<style>
    .table-wrapper {
        max_width: 100%;
        overflow_x: auto;
        border: 1px solid var(--color-border-1);
        border_radius: 12px;
        background: linear_gradient(180deg, var(--color-surface-2), var(--color-surface-1));
        box_shadow: var(--shadow-card);
    }

    table {
        border_collapse: collapse;
        width: 100%;
        min_width: 100%;
        color: var(--color-text-base);
    }

    thead th {
        position: sticky;
        top: 0;
        background: var(--color-surface-2);
        color: var(--color-text-heading-strong);
        font_weight: 650;
        z_index: 1;
    }

    th,
    td {
        border: 1px solid var(--color-border-1);
        padding: 0.55rem 0.7rem;
        text_align: center;
        white_space: nowrap;
    }

    tbody tr:nth_child(even) {
        background: color_mix(in srgb, var(--color-surface-3) 80%, transparent);
    }

    tbody tr:hover {
        background: color_mix(in srgb, var(--color-accent-1) 20%, var(--color-surface-1));
    }

    span {
        display: inline_flex;
        align_items: center;
        justify_content: center;
        min_width: 1.8rem;
        padding: 0.1rem 0.35rem;
        border_radius: 999px;
        font_weight: 700;
        letter_spacing: 0.02em;
        border: 1px solid transparent;
    }

    .bit_zero {
        background: rgba(255, 104, 104, 0.22);
        border_color: rgba(255, 132, 132, 0.42);
        color: #ffd6d6;
    }

    .bit_one {
        background: rgba(105, 219, 124, 0.24);
        border_color: rgba(140, 235, 156, 0.42);
        color: #dcffe1;
    }
</style>