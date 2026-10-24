import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { transaction_id, amount, description } = await req.json()

    const secretKey = Deno.env.get('PAYMONGO_SECRET_KEY')
    if (!secretKey) {
      throw new Error("PayMongo secret key is missing.")
    }

    const amountInCentavos = amount * 100
    const authHeader = "Basic " + btoa(secretKey + ":")

    const payload = {
      data: {
        attributes: {
          amount: amountInCentavos,
          description: description,
          remarks: transaction_id
        }
      }
    }

    const response = await fetch('https://api.paymongo.com/v1/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.errors?.[0]?.detail || "Failed to create checkout link")
    }

    return new Response(
      JSON.stringify({ checkout_url: data.data.attributes.checkout_url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})