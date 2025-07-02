FROM haproxy:latest

# Copy configuration files from App folder
COPY App/haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg
COPY App/index.html /var/www/index.html
