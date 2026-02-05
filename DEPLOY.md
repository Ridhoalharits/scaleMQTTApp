# Deploying Next.js MQTT App to AWS EC2

This guide walks you through deploying your Next.js application to an Amazon EC2 instance using Docker.

## Prerequisites
- An AWS Account
- Access to the AWS Console

## Step 1: Launch an EC2 Instance

1.  **Go to EC2 Dashboard** > **Instances** > **Launch Instances**.
2.  **Name**: `mqtt-app-server` (or similar).
3.  **OS Image**: Choose **Ubuntu Server 24.04 LTS** (or 22.04 LTS). It's stable and easy to use.
4.  **Instance Type**: `t2.micro` (free tier eligible) or `t3.small` if you need more power.
5.  **Key Pair**: Create a new key pair (e.g., `mqtt-key.pem`) and **download it**. Keep it safe!
6.  **Network Settings**: Check "Allow SSH traffic from Any source" (0.0.0.0/0) or limit to your IP.
7.  **Click Launch Instance**.

## Step 2: Connect to Your Instance

Open your terminal (Mac/Linux) or PowerShell (Windows). Navigate to where your `.pem` key is.

```bash
# Set permissions for your key (required for Mac/Linux)
chmod 400 mqtt-key.pem

# Connect via SSH (replace 1.2.3.4 with your EC2 Public IP)
ssh -i mqtt-key.pem ubuntu@1.2.3.4
```

## Step 3: Install Docker & Git

Run these commands on your EC2 instance:

```bash
# Update packages
sudo apt-get update
sudo apt-get install -y git

# Install Docker
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow running docker without sudo (optional but convenient)
sudo usermod -aG docker $USER
newgrp docker
```

## Step 4: Deploy Your Code

You can either clone your git repository or copy the files manually.

### Option A: Via Git (Recommended)
If your code is on GitHub/GitLab:
```bash
git clone https://github.com/yourusername/your-repo.git
cd your-repo
```

### Option B: Manual Copy (SCP)
If you don't use git, upload your project folder from your **local machine**:
```bash
# Run this from your LOCAL computer terminal, not the EC2 ssh session
scp -i mqtt-key.pem -r /path/to/mqtt-project ubuntu@1.2.3.4:/home/ubuntu/mqtt-app
```

## Step 5: Configure Environment

In the project directory (on EC2), create your environment file.

```bash
cd mqtt-app  # (or whatever your folder is named)
nano .env.local
```

Paste your environment variables:
```
NEXT_PUBLIC_MQTT_HOST=ews-mqtt.digital-lab.ai/mqtt
NEXT_PUBLIC_MQTT_USERNAME=your_username
NEXT_PUBLIC_MQTT_PASSWORD=your_password
```
*Press `Ctrl+O`, `Enter` to save, and `Ctrl+X` to exit.*

> **Important**: Docker will build your app and "bake in" these `NEXT_PUBLIC_` variables. If you change them, you must rebuild.

## Step 6: Build and Run

```bash
# Build and start in the background
docker compose up -d --build
```

Check if it's running:
```bash
docker compose ps
# STATUS should be "Up"
```

## Step 7: Open Firewall (Security Group)

By default, AWS blocks port 3000. You need to open it.

1.  Go to **AWS Console** > **EC2** > **Instances**.
2.  Select your instance.
3.  Click the **Security** tab > Click the **Security Group ID** (e.g., `sg-0abc123...`).
4.  Click **Edit inbound rules**.
5.  Click **Add rule**:
    *   **Type**: Custom TCP
    *   **Port range**: `3000`
    *   **Source**: `Anywhere-IPv4` (0.0.0.0/0)
6.  Click **Save rules**.

## Step 8: Access Your App

Open your browser and visit:
`http://<YOUR-EC2-PUBLIC-IP>:3000`

Example: `http://54.123.45.67:3000`

---

## Troubleshooting

- **Check Logs**: `docker compose logs -f`
- **Rebuild after changes**:
  1. `git pull` (or re-upload files)
  2. `docker compose up -d --build`
