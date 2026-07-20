/**
 * Downgrade guard shared by switch-trial-plan and create-subscription-payment.
 *
 * The exploit it closes: trial/subscribe on Business, sync the whole catalog,
 * then drop to a cheaper tier with the shop already fully online. A plan
 * change (trial OR paid) is only allowed when the account's current usage
 * fits inside the target tier's limits; otherwise the caller returns a 409
 * with the plans that DO fit, and the UI asks the user to subscribe to one
 * of those (or trim their catalog).
 */
// deno-lint-ignore-file no-explicit-any

export interface PlanRow {
  id: string;
  name: string;
  product_limit: number | null;
  trial_days?: number;
  is_active?: boolean;
  display_order?: number;
}

export interface GuardResult {
  ok: boolean;
  productCount: number;
  limit: number | null;
  /** plan ids whose limits fit the current usage (for the "pick one of these" UI) */
  allowedPlanIds: string[];
}

export async function checkPlanFits(
  supabase: any,
  userId: string,
  targetPlan: PlanRow,
  allPlans: PlanRow[],
): Promise<GuardResult> {
  // Count the user's ACTIVE products across their businesses — that's what
  // the storefront would try to serve.
  const { data: businesses } = await supabase
    .from("businesses").select("id").eq("user_id", userId);
  const bizIds = (businesses ?? []).map((b: any) => b.id);

  let productCount = 0;
  if (bizIds.length > 0) {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .in("business_id", bizIds)
      .eq("is_active", true);
    productCount = count ?? 0;
  }

  const fits = (p: PlanRow) => p.product_limit == null || productCount <= p.product_limit;
  return {
    ok: fits(targetPlan),
    productCount,
    limit: targetPlan.product_limit,
    allowedPlanIds: allPlans.filter((p) => p.is_active !== false && fits(p)).map((p) => p.id),
  };
}
