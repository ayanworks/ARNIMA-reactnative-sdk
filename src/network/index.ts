/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

export const NetworkServices: Function = async (
  url: string,
  apiType: string,
  apiBody: string,
) => {
  try {
    const response = await fetch(url, {
      method: apiType,
      body: apiBody,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
    const responseJson = await response.json()
    if (responseJson.hasOwnProperty('success')) {
      return responseJson
    } else {
      throw responseJson
    }
  } catch (error) {
    throw error
  }
}

export const OutboundAgentMessage: Function = async (
  url: string,
  apiType: string,
  apiBody: string,
) => {
  try {
    return new Promise(async function(resolve, reject) {
      const response = await fetch(url, {
        method: apiType,
        body: apiBody,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/ssi-agent-wire',
        },
      })
        .then(response => {
          response.json()
        })
        .then(json => {
          resolve(json)
        })
        .catch(error => {
          reject(
            'We are not able to communicate with the agent at this moment, Please try again later',
          )
        })
    })
  } catch (error) {
    throw new Error(
      'We are not able to communicate with the agent at this moment, Please try again later',
    )
  }
}
