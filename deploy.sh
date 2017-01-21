echo "beginning rsync"
rsync -i /Users/thor/.ssh/dreamhost_rsa -r --exclude 'deploy.sh' --exclude '.git' --exclude 'node_modules' --exclude 'my.conf.js' --exclude 'npm-debug.log' /Users/thor/Code/every909/* tidepool@tide-pool.ca:/home/tidepool/www/every909
echo "rsync complete!"
