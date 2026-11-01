import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { supabase } from "../supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const [shopResponse, { data, error }] = await Promise.all([
    admin.graphql(`#graphql
      query ShopTimezone {
        shop {
          ianaTimezone
        }
      }`),
    supabase
      .from("protected_orders")
      .select(
        "id, order_name, premium_amount, order_total, currency, created_at",
      )
      .eq("shop_domain", session.shop)
      .order("created_at", { ascending: false }),
  ]);

  if (error) throw error;

  const shopJson = await shopResponse.json();
  const timeZone: string = shopJson.data?.shop?.ianaTimezone ?? "UTC";

  return { orders: data, timeZone };
};

export default function ProtectedOrdersPage() {
  const { orders, timeZone } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Protected orders">
      <s-section>
        {orders.length === 0 ? (
          <s-paragraph>No protected orders yet</s-paragraph>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Order</s-table-header>
              <s-table-header>Premium</s-table-header>
              <s-table-header>Order total</s-table-header>
              <s-table-header>Date</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {orders.map((order) => (
                <s-table-row key={order.id}>
                  <s-table-cell>{order.order_name}</s-table-cell>
                  <s-table-cell>
                    {formatMoney(order.premium_amount, order.currency)}
                  </s-table-cell>
                  <s-table-cell>
                    {formatMoney(order.order_total, order.currency)}
                  </s-table-cell>
                  <s-table-cell>
                    {new Date(order.created_at).toLocaleDateString("en-US", {
                      timeZone,
                    })}
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>
    </s-page>
  );
}

function formatMoney(amount: number | string, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(amount));
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
