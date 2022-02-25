package org.monkshu.apis.java;

import javax.json.*;

public class ExampleAPI {
    public JsonObject doService(JsonObject jsonReq, JsonObject jsonHeaders, String url, JsonObject jsonAPIConf) {
        JsonObject result = Json.createObjectBuilder().add("result", Boolean.TRUE).add("request", jsonReq.toString()).build();
        return result;
    }
}