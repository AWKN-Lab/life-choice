#include "httplib.h"
#include <iostream>
#include <string>

import ZhouYi.QiMen.Controller;
import ZhouYi.QiMen;
import nlohmann.json;
import std;

int main() {
    httplib::Server svr;

    svr.Post("/qimen/paipan", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Content-Type", "application/json; charset=utf-8");

        nlohmann::json body;
        try {
            body = nlohmann::json::parse(req.body);
        } catch (const nlohmann::json::parse_error& e) {
            nlohmann::json err = {{"error", std::string("JSON parse error: ") + e.what()}};
            res.status = 400;
            res.set_content(err.dump(), "application/json");
            return;
        }

        if (!body.contains("year") || !body.contains("month") ||
            !body.contains("day") || !body.contains("hour")) {
            nlohmann::json err = {{"error", "Missing required fields: year, month, day, hour"}};
            res.status = 400;
            res.set_content(err.dump(), "application/json");
            return;
        }

        int year = body["year"];
        int month = body["month"];
        int day = body["day"];
        int hour = body["hour"];
        int minute = body.value("minute", 0);

        auto result = ZhouYi::QiMen::QiMenController::pai_pan_solar(
            year, month, day, hour, minute);

        if (result) {
            std::string json_str = ZhouYi::QiMen::QiMenController::get_pan_json_ordered(result.value());
            res.set_content(json_str, "application/json");
        } else {
            nlohmann::json err = {{"error", result.error()}};
            res.status = 400;
            res.set_content(err.dump(), "application/json");
        }
    });

    svr.Post("/qimen/paipan/lunar", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Content-Type", "application/json; charset=utf-8");

        nlohmann::json body;
        try {
            body = nlohmann::json::parse(req.body);
        } catch (const nlohmann::json::parse_error& e) {
            nlohmann::json err = {{"error", std::string("JSON parse error: ") + e.what()}};
            res.status = 400;
            res.set_content(err.dump(), "application/json");
            return;
        }

        if (!body.contains("year") || !body.contains("month") ||
            !body.contains("day") || !body.contains("hour")) {
            nlohmann::json err = {{"error", "Missing required fields: year, month, day, hour"}};
            res.status = 400;
            res.set_content(err.dump(), "application/json");
            return;
        }

        int year = body["year"];
        int month = body["month"];
        int day = body["day"];
        int hour = body["hour"];
        int minute = body.value("minute", 0);

        auto result = ZhouYi::QiMen::QiMenController::pai_pan_lunar(
            year, month, day, hour, minute);

        if (result) {
            std::string json_str = ZhouYi::QiMen::QiMenController::get_pan_json_ordered(result.value());
            res.set_content(json_str, "application/json");
        } else {
            nlohmann::json err = {{"error", result.error()}};
            res.status = 400;
            res.set_content(err.dump(), "application/json");
        }
    });

    svr.Get("/qimen/health", [](const httplib::Request&, httplib::Response& res) {
        nlohmann::json health = {{"status", "ok"}, {"service", "qimen-cpp"}, {"version", "1.0.0"}};
        res.set_content(health.dump(), "application/json");
    });

    svr.set_logger([](const httplib::Request& req, const httplib::Response& res) {
        std::cerr << req.method << " " << req.path << " -> " << res.status << std::endl;
    });

    int port = 30002;
    std::cout << "QiMen C++ Service starting on port " << port << std::endl;
    svr.listen("0.0.0.0", port);

    return 0;
}
