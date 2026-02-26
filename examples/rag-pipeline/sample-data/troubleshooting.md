# Troubleshooting AcmeCloud

## Common Issues

### 401 Unauthorized

**Cause**: Invalid or expired API key.

**Solution**: Generate a new API key from the dashboard. Keys expire after 90 days by default — enable auto-rotation in Settings → Security.

### 429 Too Many Requests

**Cause**: Rate limit exceeded.

**Solution**: Check the `X-RateLimit-Reset` header for when you can retry. Consider upgrading your plan for higher limits, or implement exponential backoff.

### 504 Gateway Timeout

**Cause**: The model took too long to respond (>30s default).

**Solution**:
1. Reduce `max_tokens` to get shorter responses
2. Use a faster model (e.g. `acme-fast-v1` instead of `acme-pro-v1`)
3. Enable streaming — partial responses arrive immediately

### Embeddings Return Wrong Dimensions

**Cause**: Using a different embedding model than expected.

**Solution**: Always specify the model explicitly. Different models produce different vector dimensions:
- `acme-embed-small`: 384 dimensions
- `acme-embed-large`: 1536 dimensions
- `titan-embed-v2`: 1024 dimensions

Make sure your vector index matches the dimension of your chosen model.

## Getting Help

- Documentation: docs.acmecloud.example.com
- Status page: status.acmecloud.example.com
- Support email: support@acmecloud.example.com
- Community Discord: discord.gg/acmecloud
