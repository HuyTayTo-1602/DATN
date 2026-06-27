# Connect `careerbridge.pro` To The GCP VM

This guide points the domain `careerbridge.pro` to the Google Cloud VM running
the DATN job portal (JobCV).

Replace `YOUR_VM_EXTERNAL_IP` below with the real external IP of your VM (from
**Compute Engine > VM instances**).

Use this after the app is already running on the VM from
[deploy-google-compute-engine.md](deploy-google-compute-engine.md).

## 1. Reserve A Static IP

In Google Cloud Console:

1. Open **Compute Engine > VM instances**.
2. Find the VM running the app (`jobcv-vm`).
3. Note its **External IP**.

The domain should point to a **static** external IP. If the IP is ephemeral,
reserve it first:

1. Open **VPC network > IP addresses**.
2. Find the VM's external IP.
3. If its type is **Ephemeral**, choose **Reserve static address**.
4. Give it a name such as:

```text
jobcv-static-ip
```

5. Save the reservation.

## 2. Open GCP Firewall Ports

DNS only sends users to the VM. The VM also needs firewall rules that allow web
traffic.

For a production domain, open:

```text
tcp:80
tcp:443
```

In Google Cloud Console:

1. Open **VPC network > Firewall**.
2. Click **Create firewall rule**.
3. Create a rule for HTTP:

```text
Name: allow-jobcv-http
Network: default
Direction of traffic: Ingress
Action on match: Allow
Targets: All instances in the network
Source IPv4 ranges: 0.0.0.0/0
Protocols and ports: tcp:80
```

4. Create a second rule for HTTPS:

```text
Name: allow-jobcv-https
Network: default
Direction of traffic: Ingress
Action on match: Allow
Targets: All instances in the network
Source IPv4 ranges: 0.0.0.0/0
Protocols and ports: tcp:443
```

Keep database and internal service ports closed to the public internet:

```text
5432
9000
9001
```

Once Nginx and HTTPS are in place, you can also remove the temporary public
`tcp:5173` and `tcp:9000` rules from the IP-based deployment, because all
traffic (including CV downloads) will go through ports `80`/`443`.

## 3. Add DNS Records At Your Domain Provider

Edit DNS at whoever manages the `careerbridge.pro` nameservers (for example
Hostinger hPanel, or your registrar's DNS panel).

1. Log in to the domain provider.
2. Open the DNS management page for `careerbridge.pro`.
3. Add or update these records (replace the IP with your VM's static IP):

```text
Type: A
Name: @
Points to: YOUR_VM_EXTERNAL_IP
TTL: default
```

```text
Type: CNAME
Name: www
Points to: careerbridge.pro
TTL: default
```

If the provider does not allow the `www` CNAME, use an A record instead:

```text
Type: A
Name: www
Points to: YOUR_VM_EXTERNAL_IP
TTL: default
```

Remove or replace old records that point `@` or `www` to another IP address. If
there are `AAAA` records for `@` or `www` and the VM does not have IPv6
configured, remove those `AAAA` records so browsers do not try an invalid IPv6
route.

## 4. Wait For DNS Propagation

DNS changes are not instant. They often work within minutes, but they can take
several hours.

Check from your local machine:

```powershell
Resolve-DnsName careerbridge.pro
Resolve-DnsName www.careerbridge.pro
```

Expected result:

```text
YOUR_VM_EXTERNAL_IP
```

On Linux or macOS:

```bash
dig +short careerbridge.pro
dig +short www.careerbridge.pro
```

## 5. Quick Test With The Existing App Port

The current Docker Compose setup exposes the frontend on port `5173`.

After DNS resolves, this URL should work if the app is running and the
`tcp:5173` firewall rule still exists:

```text
http://careerbridge.pro:5173
```

This is useful for testing, but it is not the final production URL because users
should not need to type `:5173`.

## 6. Add Nginx For A Clean Domain URL

Use Nginx on the VM to proxy normal web traffic:

- `http://careerbridge.pro` -> frontend container on `localhost:5173`
- `/api/...` -> backend container on `localhost:8000`
- `/cv-files/...` -> MinIO container on `localhost:9000` (so CV files load over
  the domain instead of a raw IP and port)

SSH into the VM, then install Nginx:

```bash
sudo apt update
sudo apt install -y nginx
```

Create a site config:

```bash
sudo nano /etc/nginx/sites-available/careerbridge.pro
```

Paste:

```nginx
server {
    listen 80;
    server_name careerbridge.pro www.careerbridge.pro;

    # Backend API (FastAPI serves everything under /api/v1)
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # CV files stored in MinIO (bucket: cv-files)
    location /cv-files/ {
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20m;
    }

    # Frontend (Vite dev server, needs WebSocket for hot reload)
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/careerbridge.pro /etc/nginx/sites-enabled/careerbridge.pro
sudo nginx -t
sudo systemctl reload nginx
```

Now test:

```text
http://careerbridge.pro
```

## 7. Update App Configuration For The Domain

Configuration for this project lives in the `environment:` blocks of
`docker-compose.yml` at the repository root. Edit it on the VM:

```bash
cd ~/DATN
nano docker-compose.yml
```

In the `backend` service, allow the domain origins and point the public MinIO
endpoint at the domain so CV links work over `http` (before SSL):

```yaml
      ALLOWED_ORIGINS: '["http://careerbridge.pro","http://www.careerbridge.pro"]'
      MINIO_PUBLIC_ENDPOINT: careerbridge.pro
      MINIO_SECURE: "false"
```

The frontend Vite dev server rejects unknown hostnames. Allow the domain in
`frontend/vite.config.js`:

```js
server: {
  host: '0.0.0.0',
  port: 5173,
  allowedHosts: ['careerbridge.pro', 'www.careerbridge.pro'],
  proxy: {
    '/api': {
      target: process.env.BACKEND_URL || 'http://localhost:8000',
      changeOrigin: true,
      ws: true,
    },
  },
}
```

Rebuild and restart:

```bash
docker compose up -d --build
```

## 8. Enable HTTPS With Let's Encrypt

After `http://careerbridge.pro` works, install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Request certificates:

```bash
sudo certbot --nginx -d careerbridge.pro -d www.careerbridge.pro
```

Certbot will update the Nginx config for HTTPS and set up auto-renewal.

Then update `docker-compose.yml` again so origins and CV links use `https`:

```yaml
      ALLOWED_ORIGINS: '["https://careerbridge.pro","https://www.careerbridge.pro"]'
      MINIO_PUBLIC_ENDPOINT: careerbridge.pro
      MINIO_SECURE: "true"
```

`MINIO_SECURE: "true"` makes the app generate `https://careerbridge.pro/cv-files/...`
links so CV files do not trigger mixed-content warnings on an HTTPS page.

Rebuild and restart:

```bash
docker compose up -d --build
```

Final URLs:

```text
https://careerbridge.pro
https://www.careerbridge.pro
```

## 9. Verification Checklist

Run these checks from your local machine:

```powershell
Resolve-DnsName careerbridge.pro
Resolve-DnsName www.careerbridge.pro
curl.exe -I http://careerbridge.pro
curl.exe -I https://careerbridge.pro
```

Run these checks on the VM:

```bash
cd ~/DATN
docker compose ps
curl http://localhost:8000/
curl -I http://localhost:5173
sudo nginx -t
sudo systemctl status nginx --no-pager
```

Expected:

- DNS returns your VM's static IP.
- Backend root returns `{"message":"Job Recruitment API đang hoạt động","docs":"/docs"}`.
- Nginx config test returns `syntax is ok` and `test is successful`.
- `https://careerbridge.pro` opens the app without needing `:5173`.
- Logging in works, and uploading + previewing a CV works (this confirms MinIO is
  reachable through the domain).

## 10. Troubleshooting

### DNS Does Not Resolve To The VM IP

Check:

- The A record for `@` points to the VM's static IP.
- The `www` record points to `careerbridge.pro` or directly to the VM IP.
- You edited DNS at the active nameserver provider.
- Old conflicting A or AAAA records were removed.
- Enough time has passed for DNS propagation.

### `http://careerbridge.pro` Does Not Open

Check:

- GCP firewall allows `tcp:80`.
- Nginx is installed and running.
- The Docker containers are running.
- The frontend is reachable on the VM with `curl -I http://localhost:5173`.

### Frontend Shows "Blocked request. This host is not allowed."

The Vite dev server is rejecting the domain. Add `allowedHosts` in
`frontend/vite.config.js` (Section 7) and run `docker compose up -d --build`.

### API Calls Fail With A CORS Error

`ALLOWED_ORIGINS` in the `backend` service must include the exact scheme + host
you opened the site from (`https://careerbridge.pro`). Update it and rebuild.

### CV Files Do Not Load

Check:

- The Nginx `/cv-files/` location exists and `sudo nginx -t` passes.
- `MINIO_PUBLIC_ENDPOINT` matches the domain and `MINIO_SECURE` matches the
  scheme (`true` for HTTPS).
- The MinIO container is healthy: `docker compose ps`.

### HTTPS Certificate Fails

Check:

- Both `careerbridge.pro` and `www.careerbridge.pro` resolve to the VM IP.
- GCP firewall allows `tcp:80` and `tcp:443`.
- Nginx passes `sudo nginx -t`.
- Run Certbot again after DNS is correct.

## References

- Hostinger Help Center: Manage A records at Hostinger: <https://www.hostinger.com/support/4468886/>
- Hostinger Help Center: Where to find Hostinger nameservers: <https://support.hostinger.com/en/articles/1583247-where-to-find-hostinger-nameservers>
- Google Cloud: Configure static external IP addresses: <https://cloud.google.com/compute/docs/ip-addresses/configure-static-external-ip-address>
- Certbot: Nginx on Ubuntu: <https://certbot.eff.org/instructions?ws=nginx&os=snap>
