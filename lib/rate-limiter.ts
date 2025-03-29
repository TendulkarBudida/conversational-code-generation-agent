const requestQueue: (() => Promise<void>)[] = [];
let isProcessing = false;

export const rateLimiter = async (fn: () => Promise<void>, delay = 1000) => {
  requestQueue.push(fn);

  if (!isProcessing) {
    isProcessing = true;

    while (requestQueue.length > 0) {
      const nextRequest = requestQueue.shift();
      if (nextRequest) {
        await nextRequest();
        await new Promise((resolve) => setTimeout(resolve, delay)); // Delay between requests
      }
    }

    isProcessing = false;
  }
};
