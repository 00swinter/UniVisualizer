<script>
    let { 
        icon = 'help_outline', 
        heading = 'Information', 
        children 
    } = $props();
</script>

<div class="info_block">
    <div class="info_header">
        <span class="material-icons-round">{icon}</span>
        <span class="heading_text">{heading}</span>
    </div>
    <div class="info_body">
        {@render children?.()}
    </div>
</div>

<style>
    .info_block {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid #343d4a;
        border-radius: 6px;
        padding: 10px;
        margin: 8px 0;
    }

    .info_header {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #3b82f6; /* Your accent blue */
        margin-bottom: 6px;
    }

    .info_header .material-icons-round {
        font-size: 16px;
    }

    .heading_text {
        font-size: 0.7rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .info_body {
        font-size: 0.8rem;
        line-height: 1.5;
        color: #94a3b8;
    }
</style>