/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.ambari.view.slider.rest;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;

import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;

import org.apache.ambari.view.ViewResourceHandler;
import org.apache.ambari.view.slider.SliderAppsViewController;
import org.apache.hadoop.yarn.exceptions.YarnException;
import org.apache.log4j.Logger;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.inject.Inject;

public class SliderAppsResource {

  private static final Logger logger = Logger
      .getLogger(SliderAppsResource.class);
  @Inject
  ViewResourceHandler resourceHandler;
  @Inject
  SliderAppsViewController sliderAppsViewController;

  @GET
  @Produces({ MediaType.TEXT_PLAIN, MediaType.APPLICATION_JSON })
  public Response getApps(@Context HttpHeaders headers, @Context UriInfo uri) {
    return resourceHandler.handleRequest(headers, uri, null);
  }

  @GET
  @Path("{appId}")
  @Produces({ MediaType.TEXT_PLAIN, MediaType.APPLICATION_JSON })
  public Response getApp(@Context HttpHeaders headers, @Context UriInfo uri,
      @PathParam("appId") String appId) {
    return resourceHandler.handleRequest(headers, uri, appId);
  }

  @DELETE
  @Path("{appId}")
  public void deleteApp(@Context HttpHeaders headers, @Context UriInfo uri,
      @PathParam("appId") String appId) throws YarnException, IOException {
    sliderAppsViewController.deleteSliderApp(appId);
  }

  @PUT
  @Path("{appId}")
  @Consumes({ MediaType.TEXT_PLAIN, MediaType.APPLICATION_JSON })
  public Response updateApp(@Context UriInfo uri, String jsonString,
      @PathParam("appId") String appId) throws IOException, YarnException,
      InterruptedException, URISyntaxException {
    if (jsonString != null) {
      JsonElement requestContent = new JsonParser().parse(jsonString);
      if (requestContent != null && appId != null) {
        JsonObject requestJson = requestContent.getAsJsonObject();
        if (requestJson.has("state")) {
          String newState = requestJson.get("state").getAsString();
          if ("FROZEN".equals(newState))
            sliderAppsViewController.freezeApp(appId);
          else if ("RUNNING".equals(newState))
            sliderAppsViewController.thawApp(appId);
        } else if (requestJson.has("components")) {
        }
      }
      String sliderApp = sliderAppsViewController
          .createSliderApp(requestContent.getAsJsonObject());
      if (sliderApp != null)
        return Response.created(new URI(uri.getAbsolutePath() + sliderApp))
            .build();
    }
    logger.warn("No request content sent to create app");
    return Response.status(Response.Status.BAD_REQUEST).build();
  }

  @POST
  @Consumes({ MediaType.TEXT_PLAIN, MediaType.APPLICATION_JSON })
  public Response createApp(@Context UriInfo uri, String jsonString)
      throws IOException, YarnException, InterruptedException,
      URISyntaxException {
    if (jsonString != null) {
      JsonElement requestContent = new JsonParser().parse(jsonString);
      String sliderApp = sliderAppsViewController
          .createSliderApp(requestContent.getAsJsonObject());
      if (sliderApp != null)
        return Response.created(new URI(uri.getAbsolutePath() + sliderApp))
            .build();
    }
    logger.warn("No request content sent to create app");
    return Response.status(Response.Status.BAD_REQUEST).build();
  }
}
