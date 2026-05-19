#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    gdt_construction_planner_lib::run();
}
