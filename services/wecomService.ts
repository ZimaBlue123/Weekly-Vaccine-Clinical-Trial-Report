/**
 * Sends a markdown message to the WeCom Webhook.
 * 
 * NOTE: Calling this directly from a browser typically triggers CORS errors because
 * WeCom API does not allow requests from arbitrary origins (browsers).
 * 
 * In a real production environment, this should be routed through a backend proxy.
 * However, for this purely frontend demo, we will attempt the fetch.
 * If CORS fails, we simulate the success for demonstration or advise the user.
 */
export const sendToWeCom = async (webhookUrl: string, content: string): Promise<void> => {
  const payload = {
    msgtype: "markdown",
    markdown: {
      content: content
    }
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors', // Detailed explanation below
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    // With mode: 'no-cors', we get an opaque response. We can't read the status or body.
    // This is the only way to "fire and forget" from a browser without a proxy if the server doesn't support CORS.
    // We assume success if no network error occurred.
    console.log("Request sent (Opaque response due to no-cors mode)");

  } catch (error) {
    console.error("WeCom Webhook Error:", error);
    throw error;
  }
};
