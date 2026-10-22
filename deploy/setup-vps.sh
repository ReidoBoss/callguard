#!/bin/bash
# One-time setup of buddy-root for call.budddy.app, as root. Safe to re-run.
#
#   scp deploy/setup-vps.sh deploy/callguard-ssh buddy-root:/tmp/
#   ssh buddy-root bash /tmp/setup-vps.sh "$(cat deploy.pub)" "$(cat tunnel.pub)"
#
# deploy.pub is the GitHub Actions key (DEPLOY_SSH_KEY), tunnel.pub the Mac mini's
# tunnel key. Each can do one thing: rsync + restart, or hold the Gemma tunnel open.
set -euo pipefail
deploy_key=$1
tunnel_key=$2
here=$(dirname "$0")

id callguard >/dev/null 2>&1 || useradd --create-home --shell /bin/sh callguard
usermod -aG docker callguard
install -m 755 "$here/callguard-ssh" /usr/local/bin/callguard-ssh
install -d -o callguard -g callguard -m 755 ~callguard/app
install -d -o callguard -g callguard -m 700 ~callguard/.ssh
cat > ~callguard/.ssh/authorized_keys <<EOF
restrict,command="/usr/local/bin/callguard-ssh" $deploy_key
restrict,port-forwarding,permitlisten="172.17.0.1:11434",command="/usr/sbin/nologin" $tunnel_key
EOF
chown callguard:callguard ~callguard/.ssh/authorized_keys
chmod 600 ~callguard/.ssh/authorized_keys

# The tunnel listens on the Docker bridge only, never the public interface. Binding to
# an address other than loopback needs GatewayPorts, so only this user gets it.
cat > /etc/ssh/sshd_config.d/99-callguard.conf <<'EOF'
Match User callguard
    GatewayPorts clientspecified
    AllowTcpForwarding remote
    PermitListen 172.17.0.1:11434
    PermitOpen none
    X11Forwarding no
    AllowAgentForwarding no
    PermitTTY no
EOF
sshd -t
systemctl reload ssh

# Containers on budddy-staging_default reach the bridge address through ufw's INPUT chain
ufw allow proto tcp from 172.16.0.0/12 to 172.17.0.1 port 11434 comment 'callguard gemma tunnel'
