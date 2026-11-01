const toggle = document.getElementById('order-protection-toggle');

if (toggle) {
  const variantId = Number(toggle.dataset.variantId);
  const root = window.Shopify?.routes?.root || '/';

  toggle.addEventListener('change', async () => {
    const checked = toggle.checked;
    toggle.disabled = true;

    try {
      const res = checked
        ? await fetch(`${root}cart/add.js`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: [{ id: variantId, quantity: 1 }] }),
          })
        : await fetch(`${root}cart/change.js`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: String(variantId), quantity: 0 }),
          });

      if (!res.ok) throw new Error(`Cart request failed: ${res.status}`);
      location.reload();
    } catch (err) {
      console.error(err);
      toggle.checked = !checked;
      toggle.disabled = false;
    }
  });
}
