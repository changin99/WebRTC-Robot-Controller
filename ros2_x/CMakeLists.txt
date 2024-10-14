cmake_minimum_required(VERSION 3.5)
project(manipulator_control)

# 패키지 관리자를 통해 GStreamer 모듈 찾기
find_package(PkgConfig REQUIRED)
pkg_check_modules(GSTREAMER REQUIRED gstreamer-1.0)
pkg_check_modules(GSTREAMER_VIDEO REQUIRED gstreamer-video-1.0)

find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
find_package(std_msgs REQUIRED)
find_package(sensor_msgs REQUIRED)
find_package(Threads REQUIRED)

include_directories(
  include
  ${rclcpp_INCLUDE_DIRS}
  ${std_msgs_INCLUDE_DIRS}
  ${sensor_msgs_INCLUDE_DIRS}
  ${GSTREAMER_INCLUDE_DIRS}
  ${GSTREAMER_VIDEO_INCLUDE_DIRS}
  /usr/include
)

add_executable(manipulator_node src/manipulator_node.cpp)

target_link_libraries(manipulator_node
  ${rclcpp_LIBRARIES}
  ${std_msgs_LIBRARIES}
  ${sensor_msgs_LIBRARIES}
  ${GSTREAMER_LIBRARIES}
  ${GSTREAMER_VIDEO_LIBRARIES}
  Threads::Threads
)

ament_target_dependencies(manipulator_node
  rclcpp
  std_msgs
  sensor_msgs
)

install(TARGETS
  manipulator_node
  DESTINATION lib/${PROJECT_NAME}
)

ament_package()
