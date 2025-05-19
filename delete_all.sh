aws dynamodb scan \
  --table-name CdkStack-InvoicesTable011644E3-JOSHDS0HY6Z4 \
  --attributes-to-get "CUSTOMER_ID" "INVOICE_ID" \
  --output json --profile super | \
  jq -c '.Items[]' | \
  while read item; do
    aws dynamodb delete-item \
      --table-name CdkStack-InvoicesTable011644E3-JOSHDS0HY6Z4 \
      --key "$item" \
      --profile super
  done
