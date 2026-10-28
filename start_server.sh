#!/bin/bash
set -e
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
    nvm use 24 > /dev/null
fi
node server/index.js
