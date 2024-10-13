cmake_minimum_required(VERSION 3.5)
project(manipulator_control)

# ROS2 및 기타 필수 패키지 찾기
find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
find_package(dynamixel_sdk REQUIRED)  # dynamixel_sdk 패키지 추가

# Include directories
include_directories(
  include
  ${CMAKE_SOURCE_DIR}/external/websocketpp
  ${dynamixel_sdk_INCLUDE_DIRS}  # dynamixel_sdk 헤더 파일 경로 추가
)

# Executable 설정
add_executable(manipulator_node src/manipulator_node.cpp)

# Link libraries
ament_target_dependencies(manipulator_node rclcpp dynamixel_sdk)

# 설치 경로 설정
install(TARGETS manipulator_node
  DESTINATION lib/${PROJECT_NAME}
)

ament_package()
