# Flux Bot

This is a Discord bot that interfaces with the [Weights.gg Unofficial API](https://github.com/fox3000foxy/weights.gg-api) to generate images based on user prompts.

## Features

-   **Image Generation:** Generates images based on prompts provided by Discord users.
-   **LoRA Support:** Allows users to specify a LoRA (Low-Rank Adaptation) model to be used during image generation.
-   **API Integration:** Communicates with the Weights.gg Unofficial API to handle image generation requests.
-   **Concurrency Management:** Manages concurrent image generation requests using browser spaces.
-   **Error Handling:** Implements error handling to gracefully handle issues such as invalid prompts or API errors.
-   **Command Management:** Uses Discord.js slash commands for a user-friendly experience.
-   **Restart Command:** Provides a command to restart the bot and the Weights.gg API.

## Setup

### Prerequisites

-   Node.js (v16 or higher)
-   npm or yarn
-   A Discord bot token
-   Access to the Weights.gg Unofficial API

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/fox3000foxy/flux-discord-bot/
    cd flux-bot
    ```

2.  Install dependencies:

    ```bash
    npm install
    # or
    yarn install
    ```

    *More dependencies can be required while starting the project on Linux.*

3.  Configure environment variables:

    -   Create a `.env` file in the root directory.
    -   Add the following environment variables:

        ```
        DISCORD_TOKEN=your-discord-bot-token
        API_URL="http://localhost:3000" # Link to the Weights Unofficial API here
        API_KEY=an-x-api-key-here # The same API key you use to access the Weights Unofficial API
        ```

    -   Replace `your-discord-bot-token`, `http://localhost:3000`, and `an-x-api-key-here` with your actual Discord bot token, API URL, and API key, respectively.  See `#env.sample` for an example.

### Running the Bot

```bash
node index.js
