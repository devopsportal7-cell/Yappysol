import axios from 'axios';
import http from 'http';
import https from 'https';
import CacheableLookup from 'cacheable-lookup';

const cacheable = new CacheableLookup({
  maxTtl: 60,           // cap DNS TTL at 60s
  errorTtl: 1,          // retry quickly on DNS errors
  fallbackDuration: 60, // keep fallback cache briefly
});

const httpAgent  = new http.Agent({ keepAlive: true, family: 4 });
const httpsAgent = new https.Agent({ keepAlive: true, family: 4 });

cacheable.install(httpAgent);
cacheable.install(httpsAgent);

export const httpClient = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 10_000,
  headers: { 'Accept-Encoding': 'gzip, compress, deflate, br' },
});

