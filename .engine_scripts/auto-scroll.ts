export default async (): Promise<void> => {
  const SCROLL_DISTANCE = 100;
  const SCROLL_DOWN_MAX = 100;
  const SCROLL_TOP_MAX = 100;

  if (!!window.visualTestScrollingBottom) {
    return;
  }

  const scrollToBottom = async (): Promise<void> => {
    window.visualTestScrollingBottom = true;
    let counter = 0;
    let lastScrollY = 0;
    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        if (window.innerHeight + Math.ceil(window.scrollY) >= document.body.offsetHeight || counter > SCROLL_DOWN_MAX) {
          // you're at the bottom of the page
          clearInterval(timer);
          window.visualTestScrollingBottom = false;
          resolve();
          return;
        }

        if (lastScrollY >= Math.ceil(window.scrollY)) {
          counter++;
        } else {
          lastScrollY = Math.ceil(window.scrollY);
          counter = 0;
        }

        window.scrollBy(0, SCROLL_DISTANCE);
      }, 100);
    });
  };

  const scrollToTop = async (): Promise<void> => {
    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        if (!window.visualTestScrollingBottom) {
          clearInterval(timer);
          resolve();
          return;
        }
      }, 100);
    });
    await new Promise<void>((resolve) => {
      let counter = 0;
      const timer = setInterval(() => {
        if (window.scrollY === 0 || counter > SCROLL_TOP_MAX) {
          clearInterval(timer);
          resolve();
          return;
        }

        counter++;
        window.scrollTo(0, 0);
      }, 100);
    });
  };

  await scrollToBottom();
  await scrollToTop();
};
