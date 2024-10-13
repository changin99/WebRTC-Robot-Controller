cmake_minimum_required(VERSION 3.5)
project(manipulator_control)

# C++11 표준 사용
if(NOT CMAKE_CXX_STANDARD)
  set(CMAKE_CXX_STANDARD 11)
endif()

# 의존성 설정
find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
find_package(std_msgs REQUIRED)

add_executable(manipulator_node src/manipulator_node.cpp)  # 노드 실행 파일

ament_target_dependencies(manipulator_node rclcpp std_msgs)

install(TARGETS
  manipulator_node
  DESTINATION lib/${PROJECT_NAME})

ament_package()
