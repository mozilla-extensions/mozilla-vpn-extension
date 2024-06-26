class Main {
  constructor() {
  }

  async init() {
    console.info("Hello from the background script!");
  } 
}

const main = new Main();
main.init();