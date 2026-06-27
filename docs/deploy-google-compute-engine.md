# Deploy The DATN Job Portal To Google Cloud Compute Engine

This guide deploys the **JobCV** job recruitment portal (this repository) to one Google Cloud Compute Engine VM using Docker Compose.

The app runs these containers:

- `frontend` (React + Vite dev server) on port `5173`
- `backend` (FastAPI) on port `8000`
- `postgres` (PostgreSQL 16) on port `5432`
- `minio` (object storage for CV files) on ports `9000` (API) and `9001` (web console)

For a first deployment, open the web app at:

```text
http://YOUR_VM_EXTERNAL_IP:5173
```

## 0. What You Need Before Starting

You need:

1. A Google account.
2. A Google Cloud project with billing enabled.
3. This repository pushed to GitHub (`https://github.com/HuyTayTo-1602/DATN`).
4. Basic access to the Google Cloud Console.

If your code is not pushed anywhere yet, push it first. The VM needs a way to download the code.

## 1. Create Or Select A Google Cloud Project

1. Open the Google Cloud Console: <https://console.cloud.google.com/>
2. At the top of the page, click the project selector.
3. Click **New Project**, or select an existing project.
4. Make sure billing is enabled for the project.
5. In the search bar, search for **Compute Engine API**.
6. Open it and click **Enable** if it is not enabled yet.

## 2. Create A Compute Engine VM

1. In Google Cloud Console, search for **Compute Engine**.
2. Open **Compute Engine > VM instances**.
3. Click **Create instance**.
4. Use these settings in the **Machine configuration** section:

```text
Name: jobcv-vm
Region: choose the region closest to your users (e.g. asia-southeast1)
Zone: any zone in that region
Machine type: e2-standard-2
```

5. Find the **OS and Storage** section.
6. Next to the boot disk, click **Change**.
7. On the **Public images** tab, choose:

```text
Operating system: Ubuntu
Version: Ubuntu 24.04 LTS
Boot disk type: Balanced persistent disk
Size: 30 GB
```

8. Click **Select**.
9. Find the **Networking** section.
10. Find the **Firewall** area.
11. Check **Allow HTTP traffic**.

Notes:

- `e2-standard-2` gives 2 vCPU and 8 GB RAM. This is comfortable for the full stack because Postgres, MinIO, backend, and the Vite frontend all run on the same VM.
- `Allow HTTP traffic` opens port `80`, but this app currently runs on port `5173`, so you still need the custom firewall rule in the next step.
- If you do not see **Allow HTTP traffic**, it is usually inside **Networking > Firewall** on the left side of the VM creation form.

12. Click **Create**.
13. Wait until the VM shows a green check mark.

## 3. Create A Firewall Rule For The Frontend

The frontend container listens on port `5173`.

1. In Google Cloud Console, go to **VPC network > Firewall**.
2. Click **Create firewall rule**.
3. Fill in:

```text
Name: allow-jobcv-frontend-5173
Network: default
Direction of traffic: Ingress
Action on match: Allow
Targets: All instances in the network
Source IPv4 ranges: 0.0.0.0/0
Protocols and ports: tcp:5173
```

4. Click **Create**.

Optional for testing the backend Swagger docs:

Create another firewall rule for `tcp:8000`. If possible, set **Source IPv4 ranges** to your own IP address instead of `0.0.0.0/0`.

Do not create public firewall rules for:

```text
5432
9000
9001
```

Those are Postgres and MinIO (storage API + admin console). Keep them private. CV files are served to users through the backend, so the browser does not need direct public access to MinIO during a first IP-based deployment.

## 4. SSH Into The VM

1. Go to **Compute Engine > VM instances**.
2. Find `jobcv-vm`.
3. Click **SSH**.
4. A browser terminal will open.

All commands below are run inside that SSH terminal.

## 5. Update Ubuntu

```bash
sudo apt update
sudo apt upgrade -y
```

## 6. Install Git And Nano

```bash
sudo apt install -y git nano
```

`git` downloads the repository. `nano` is a beginner-friendly terminal editor for editing `docker-compose.yml`.

Check Git:

```bash
git --version
```

## 7. Install Docker And Docker Compose

Run these commands on the VM:

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

```bash
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Check Docker:

```bash
sudo docker run hello-world
docker compose version
```

Allow your SSH user to run Docker without typing `sudo` every time:

```bash
sudo usermod -aG docker $USER
```

Close the SSH tab, open SSH again, then check:

```bash
docker ps
```

If `docker ps` works without an error, Docker is ready.

## 8. Download The Project Code

The repository is public, so you can clone it over HTTPS:

```bash
cd ~
git clone https://github.com/HuyTayTo-1602/DATN.git
cd DATN
```

Set your Git identity so future commits and pulls are clean:

```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

If the repository is private, create an SSH key on the VM with
`ssh-keygen -t ed25519 -C "your-email@example.com"`, add the public key from
`cat ~/.ssh/id_ed25519.pub` to <https://github.com/settings/keys>, then clone
with `git clone git@github.com:HuyTayTo-1602/DATN.git`.

## 9. Configure Production Values

This project reads configuration from the `environment:` blocks in
`docker-compose.yml`. Those values override any `.env` file, so for deployment
you edit `docker-compose.yml` directly.

The compose file lives at the repository root:

```bash
cd ~/DATN
nano docker-compose.yml
```

Change the following values away from the development defaults.

### 9.1 Postgres password

In the `postgres` service:

```yaml
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: CHANGE_THIS_TO_A_LONG_RANDOM_PASSWORD
      POSTGRES_DB: job_recruitment
```

### 9.2 Backend settings

In the `backend` service, update `DATABASE_URL` to use the same password, set a
strong `SECRET_KEY`, turn off debug, and add `ALLOWED_ORIGINS` so the browser is
allowed to call the API. `ALLOWED_ORIGINS` is **not** in the default compose
file, so add the line yourself:

```yaml
    environment:
      DATABASE_URL: postgresql://postgres:CHANGE_THIS_TO_A_LONG_RANDOM_PASSWORD@postgres:5432/job_recruitment
      SECRET_KEY: CHANGE_THIS_TO_A_LONG_RANDOM_SECRET
      DEBUG: "false"
      ALLOWED_ORIGINS: '["http://YOUR_VM_EXTERNAL_IP:5173"]'
      MINIO_ENDPOINT: minio:9000
      MINIO_PUBLIC_ENDPOINT: YOUR_VM_EXTERNAL_IP:9000
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
      MINIO_BUCKET_NAME: cv-files
      MINIO_SECURE: "false"
```

If you use the chatbot feature, also add your LLM keys:

```yaml
      ANTHROPIC_API_KEY: your-claude-api-key
      GROQ_API_KEY: your-groq-api-key
```

Generate a strong `SECRET_KEY` with:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Important:

- Replace `YOUR_VM_EXTERNAL_IP` with the VM external IP from the Compute Engine
  VM list.
- `ALLOWED_ORIGINS` must be valid JSON (double quotes inside, wrapped in single
  quotes for YAML).
- `MINIO_PUBLIC_ENDPOINT` is the address the **browser** uses to download CV
  files. See the MinIO note below.

Save in nano:

1. Press `Ctrl + O`.
2. Press `Enter`.
3. Press `Ctrl + X`.

### 9.3 MinIO and CV files (important)

CV files are stored in MinIO. When a candidate or recruiter previews/downloads a
CV, the browser fetches it from `MINIO_PUBLIC_ENDPOINT` using a temporary signed
URL.

For this IP-based deployment, set:

```yaml
      MINIO_PUBLIC_ENDPOINT: YOUR_VM_EXTERNAL_IP:9000
      MINIO_SECURE: "false"
```

and temporarily open `tcp:9000` to your own IP for testing. Once you put the app
behind a domain with HTTPS, route CV downloads through Nginx instead of exposing
port `9000` — this is covered in
[connect-hostinger-domain-to-gcp-vm.md](connect-hostinger-domain-to-gcp-vm.md).

## 10. Start The App

Make sure you are at the repository root:

```bash
cd ~/DATN
pwd
```

The output should end with:

```text
/DATN
```

Start everything:

```bash
docker compose up -d --build
```

Check containers:

```bash
docker compose ps
```

Wait until `postgres` and `minio` are healthy and `backend` and `frontend` are
running. The backend creates the database tables automatically on first
startup.

## 11. Seed Sample Data

The app ships with seed scripts that create roles, demo users, companies, jobs,
candidates, CVs, applications, and notifications. Run the master seed inside the
backend container:

```bash
docker compose exec backend python scripts/seed/run_full_seed.py
```

To wipe existing seed data and re-seed cleanly:

```bash
docker compose exec backend python scripts/seed/run_full_seed.py --truncate --yes
```

## 12. Test The Deployment

In the VM SSH terminal:

```bash
curl http://localhost:8000/
```

Expected result (the health/root endpoint):

```json
{"message":"Job Recruitment API đang hoạt động","docs":"/docs"}
```

From your browser:

```text
http://YOUR_VM_EXTERNAL_IP:5173
```

If you opened backend port `8000`, you can also test the API docs:

```text
http://YOUR_VM_EXTERNAL_IP:8000/docs
```

## 13. Common Commands

Run these from the `~/DATN` folder.

See container status:

```bash
docker compose ps
```

See logs for all containers:

```bash
docker compose logs -f
```

See backend logs only:

```bash
docker compose logs -f backend
```

Restart the app:

```bash
docker compose restart
```

Stop the app:

```bash
docker compose down
```

Stop the app and delete database + CV volumes:

```bash
docker compose down -v
```

Only use `docker compose down -v` if you are okay deleting local Postgres data
and uploaded CV files on the VM.

## 14. Deploy New Code Later

When you update the code and push it to GitHub, SSH into the VM and run:

```bash
cd ~/DATN
git pull
docker compose up -d --build
```

If you changed seed data and want to refresh it:

```bash
docker compose exec backend python scripts/seed/run_full_seed.py --truncate --yes
```

Check the app again:

```bash
docker compose ps
curl http://localhost:8000/
```

Note: `git pull` may conflict with your edited `docker-compose.yml`. If so, keep
your production values and re-apply any upstream changes by hand, or move your
secrets into a separate file later (see Production Notes).

## 15. Troubleshooting

### The Browser Cannot Open The Site

Check:

1. The VM is running.
2. The external IP is correct.
3. The firewall rule allows `tcp:5173`.
4. The frontend container is running:

```bash
cd ~/DATN
docker compose ps
docker compose logs -f frontend
```

### Backend Is Unhealthy

Check backend logs:

```bash
docker compose logs -f backend
```

Common causes:

- `DATABASE_URL` password does not match `POSTGRES_PASSWORD`.
- Postgres is still starting.
- A required environment value is missing or malformed.

### API Calls Fail With A CORS Error

The browser console shows a CORS error when `ALLOWED_ORIGINS` does not include
the address you opened the site from. Make sure the `backend` service has, for
example:

```yaml
      ALLOWED_ORIGINS: '["http://YOUR_VM_EXTERNAL_IP:5173"]'
```

Then rebuild:

```bash
docker compose up -d --build
```

### CV Files Will Not Open Or Download

Check:

- `MINIO_PUBLIC_ENDPOINT` points to an address the browser can reach.
- The MinIO container is healthy: `docker compose ps`.
- For an IP deployment, `tcp:9000` is reachable from your machine.

### Docker Says Permission Denied

Run:

```bash
sudo usermod -aG docker $USER
```

Then close SSH and open it again.

### The VM Is Too Slow

Stop the VM and change the machine type to a larger one, such as:

```text
e2-standard-4
```

Then start the VM again.

## 16. Important Production Notes

This guide uses the current repository Docker setup. It is good for a graduation
demo or a first VM deployment.

Before using it for real users, improve these items:

1. Add HTTPS with a domain name (see the domain guide).
2. Serve the frontend as a production build instead of the Vite dev server.
3. Stop exposing backend port `8000` publicly unless you need it.
4. Change the MinIO `minioadmin` / `minioadmin` credentials.
5. Move secrets (`SECRET_KEY`, passwords, API keys) out of `docker-compose.yml`
   into a separate `.env`/Secret Manager and reference them, so `git pull` does
   not conflict with your edits.
6. Add VM disk snapshots or database + MinIO backups.

## 17. Clean Up To Avoid Charges

If you are finished testing:

1. Go to **Compute Engine > VM instances**.
2. Select `jobcv-vm`.
3. Click **Stop** to pause compute charges.
4. Click **Delete** if you no longer need it.

Also check:

- **VPC network > IP addresses** for unused static IPs.
- **Disks** for unattached persistent disks.
- **Snapshots** if you created any.

## References

- Google Cloud: Create a Linux VM instance in Compute Engine: <https://cloud.google.com/compute/docs/create-linux-vm-instance>
- Google Cloud: Use VPC firewall rules: <https://cloud.google.com/firewall/docs/using-firewalls>
- Google Cloud: Configure static external IP addresses: <https://cloud.google.com/compute/docs/ip-addresses/configure-static-external-ip-address>
- Docker: Install Docker Engine on Ubuntu: <https://docs.docker.com/engine/install/ubuntu/>
- MinIO: MinIO Docker quickstart: <https://min.io/docs/minio/container/index.html>
