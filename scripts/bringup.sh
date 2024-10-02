#!/bin/bash
# Check if bringup node is running and kill it if it is
rosnode list | grep -E 'turtlebot3_core' | xargs -I {} rosnode kill {} || true

# Set TurtleBot model to waffle
export TURTLEBOT3_MODEL=waffle
source /opt/ros/noetic/setup.bash

# Start bringup
roslaunch turtlebot3_bringup turtlebot3_robot.launch
