/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/
import InboundMessageService from '../transports';

export const NetworkServices: Function = async (url: string, apiType: string, apiBody: string) => {
  try {
    const response = await fetch(url, {
      method: apiType,
      body: apiBody,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    const responseJson = await response.json();
    if (responseJson.hasOwnProperty('success')) {
      return responseJson;
    } else {
      throw responseJson;
    }
  } catch (error) {
    throw error;
  }
};

export const OutboundAgentMessage: Function = async (url: string, apiType: string, apiBody: string) => {
  try {
    console.log("url", url)
    console.log("apiBody", apiBody)
    const abortController = new AbortController()
    const id = setTimeout(() => abortController.abort(), 15000)
    const response = await fetch(url, {
      method: 'POST',
      body: apiBody,
      headers: { 'Content-Type': 'application/ssi-agent-wire' },
      signal: abortController.signal,
    })
    clearTimeout(id)
    const responseMessage = await response.text()
    if (responseMessage) {
      console.log(`Response received`, { responseMessage, status: response.status })
      try {
        const wireMessage = JSON.parse(responseMessage)
        console.log(`Response received`, wireMessage)
        if (wireMessage.hasOwnProperty('tag')) {
          await InboundMessageService.addMessages(wireMessage)
        }
      } catch (error) {
        console.log('Unable to parse response message', error)
      }
    } else {
      console.log(`No response received.`)
    }
  } catch (error) {
    console.log('Error OutboundAgentMessage', error)
    if (error.name == 'AbortError') {
      console.log('Signal aborted')
    } else {
      throw new Error('We are not able to communicate with the agent at this moment, Please try again later');
    }
  }
};