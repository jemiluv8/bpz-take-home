aws dynamodb scan \
  --table-name CustomerInvoicesV2 \
  --attributes-to-get "CUSTOMER_ID" "INVOICE_ID" \
  --output json --profile super | \
  jq -c '.Items[]' | \
  while read item; do
    aws dynamodb delete-item \
      --table-name CustomerInvoicesV2 \
      --key "$item" \
      --profile super
  done
