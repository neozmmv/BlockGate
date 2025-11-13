# BlockGate — Self-Hosted Minecraft Server Management Platform

### ⭐ Thank you!

First of all, I want to really thank you all for the amazing support that **BlockGate** has got in such a short period of time! In just **12** hours, our project became the **#1** post of the day in r/selfhosted, and we got **50** stars in the project repository!

<img width="760" height="111" alt="image" src="https://github.com/user-attachments/assets/184c3940-9f4c-42ed-a570-6589ca62305d" />

**BlockGate** is an **open-source, self-hosted control panel** for managing and running **Minecraft servers** with Docker.  
It was built to provide a modern, developer-friendly, and efficient way to create, manage, and monitor Minecraft instances, all from a simple and elegant web interface.

> 🔒 Licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** — free and open for everyone, but protected against closed-source commercial forks.

---

## Run instructions (Work in Progress)

- To run **BlockGate**, you need Docker and Docker Compose installed.
- The `docker-compose.yml` file has all the project core dependencies
- Follow the steps to run **BlockGate**:

```
git clone https://github.com/neozmmv/BlockGate
```

- Go to [BetterAuth](https://www.better-auth.com/docs/installation) and click on "Generate Secret"
- Copy the generated secret to the `.env.example` file and rename it to `.env`

- Start **BlockGate** with:

```
sudo docker compose up -d
```

## For development:

- In the terminal, run:

```
pnpm dlx prisma migrate dev
```

and run the web app with:

```
pnpm dev
```

#### These are instructions for running in dev mode!

## ❗Important

If you run BlockGate on your device and create a server, it will be accessible by your machine IP and PORT inside your local network. If you want to make your server accessible outside your local network (allowing friends and others to join), you'll have to put your machine and the server / VPS in the same network. You can achieve this by using some tools like [TailScale](https://tailscale.com) or other VPN service.

**BlockGate** runs on localhost:3000 **(Subject to change)**

## Control Panel

<img width="1919" height="915" alt="image" src="https://github.com/user-attachments/assets/a78ac563-dd36-43e8-b4da-351e2c54a6f0" />
This is the current state of the server control panel.

## Overview

BlockGate lets you easily create and manage Minecraft servers on your own infrastructure.  
It aims to combine the simplicity of plug-and-play panels like Aternos with the power and flexibility of full Docker orchestration.

---

## Core Concepts

- **Self-Hosted by Design** — runs entirely on your server with Docker Compose.
- **Modular Architecture** — built with a clear separation between the **web panel** and a local **agent** that controls Docker.
- **Open Source Core** — transparent and extensible; ideal for developers, communities, and enthusiasts.
- **Future-Proof Foundation** — ready for scaling into a multi-node hosting environment later.
- **Minecraft-Focused** — built exclusively for Minecraft servers, with an emphasis on simplicity, performance, and automation.
- **Docker Based** — all Minecraft servers are isolated Docker containers based on the `itzg/minecraft-server` image.
