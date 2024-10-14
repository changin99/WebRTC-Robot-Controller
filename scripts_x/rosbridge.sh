#!/bin/bash
# Check if rosbridge node is running and kill it if it is
rosnode list | grep -E 'rosbridge_websocket' | xargs -I {} rosnode kill {} || true

# Start rosbridge
source /opt/ros/noetic/setup.bash
roslaunch rosbridge_server rosbridge_websocket.launch
