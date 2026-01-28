#!/bin/bash
cd /home/kavia/workspace/code-generation/multiplayer-dots-and-boxes-platform-206416-206427/dots_and_boxes_web
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

