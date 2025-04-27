# Flux Bot

This is a Discord bot that interfaces with the [Weights.gg Unofficial API](https://github.com/fox3000foxy/weights.gg-api) to generate images based on user prompts.

![image](https://github.com/user-attachments/assets/d5809ab1-8aea-49fa-9003-af9c39fab815)


[![Invite Bot](https://img.shields.io/badge/Invite%20Bot-Click%20Here-blue)](https://discord.com/oauth2/authorize?client_id=1343500309519142922)


## Features

-   **Image Generation:** Generates images based on prompts provided by Discord users.
-   **LoRA Support:** Allows users to specify a LoRA (Low-Rank Adaptation) model to be used during image generation.
-   **API Integration:** Communicates with the Weights.gg Unofficial API to handle image generation requests.
-   **Concurrency Management:** Manages concurrent image generation requests using browser spaces.
-   **Error Handling:** Implements error handling to gracefully handle issues such as invalid prompts or API errors.
-   **Command Management:** Uses Discord.js slash commands for a user-friendly experience.

## Commands

-   **/gen**: Generates an image based on a user-provided prompt. Optionally, users can specify a LoRA model to enhance the image generation.
-   **/quota**: Fetches and displays the user's current quota usage for image and voice generation.
-   **/tts**: Converts text to speech using a specified voice model, with optional pitch and gender settings.
-   **/voice-convert**: Converts an uploaded audio file to a different voice using a specified voice model and optional pitch adjustments.
-   **/search-loras**: Searches for LoRA models or voice models based on a query. Users can filter results by type (audio or image).
-   **Convert Voice (Context Menu)**: Allows users to convert an audio file attached to a message into a different voice using a modal interface.

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
