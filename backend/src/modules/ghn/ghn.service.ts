import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

type GhnRequestOptions = {
  method?: 'GET' | 'POST';
  body?: any;
  includeShopIdHeader?: boolean;
};

@Injectable()
export class GhnService {
  private readonly fetchFn = (globalThis as any).fetch;

  getEnv(): 'test' | 'production' {
    return process.env.GHN_ENV === 'production' ? 'production' : 'test';
  }

  getBaseUrl() {
    return this.getEnv() === 'production'
      ? 'https://online-gateway.ghn.vn/shiip/public-api'
      : 'https://dev-online-gateway.ghn.vn/shiip/public-api';
  }

  hasConfig() {
    return !!process.env.GHN_TOKEN && !!process.env.GHN_SHOP_ID;
  }

  getToken() {
    const token = process.env.GHN_TOKEN;
    if (!token) {
      throw new InternalServerErrorException('Thiếu GHN_TOKEN trong .env');
    }
    return token;
  }

  getShopId() {
    const shopId = Number(process.env.GHN_SHOP_ID);
    if (!Number.isInteger(shopId) || shopId <= 0) {
      throw new InternalServerErrorException('GHN_SHOP_ID không hợp lệ');
    }
    return shopId;
  }

  getFromConfig() {
    const districtId = Number(process.env.GHN_FROM_DISTRICT_ID);
    if (!Number.isInteger(districtId) || districtId <= 0) {
      throw new InternalServerErrorException(
        'GHN_FROM_DISTRICT_ID không hợp lệ',
      );
    }

    const wardCode = process.env.GHN_FROM_WARD_CODE;
    if (!wardCode) {
      throw new InternalServerErrorException('Thiếu GHN_FROM_WARD_CODE');
    }

    const name = process.env.GHN_FROM_NAME;
    const phone = process.env.GHN_FROM_PHONE;
    const address = process.env.GHN_FROM_ADDRESS;

    if (!name || !phone || !address) {
      throw new InternalServerErrorException(
        'Thiếu GHN_FROM_NAME / GHN_FROM_PHONE / GHN_FROM_ADDRESS',
      );
    }

    return {
      name,
      phone,
      address,
      districtId,
      wardCode,
    };
  }

  getReturnConfig() {
    const fallback = this.getFromConfig();

    return {
      name: process.env.GHN_RETURN_NAME || fallback.name,
      phone: process.env.GHN_RETURN_PHONE || fallback.phone,
      address: process.env.GHN_RETURN_ADDRESS || fallback.address,
      wardCode: process.env.GHN_RETURN_WARD_CODE || fallback.wardCode,
      districtId: Number(
        process.env.GHN_RETURN_DISTRICT_ID || fallback.districtId,
      ),
    };
  }

  getDefaultRequiredNote() {
    return process.env.GHN_REQUIRED_NOTE || 'KHONGCHOXEMHANG';
  }

  getDefaultPaymentTypeId() {
    const v = Number(process.env.GHN_PAYMENT_TYPE_ID || 1);
    return Number.isInteger(v) && [1, 2].includes(v) ? v : 1;
  }

  getDefaultParcel() {
    return {
      weight: Math.max(1, Number(process.env.GHN_DEFAULT_WEIGHT || 500)),
      length: Math.max(1, Number(process.env.GHN_DEFAULT_LENGTH || 20)),
      width: Math.max(1, Number(process.env.GHN_DEFAULT_WIDTH || 20)),
      height: Math.max(1, Number(process.env.GHN_DEFAULT_HEIGHT || 10)),
    };
  }

  private async request<T = any>(
    path: string,
    options: GhnRequestOptions = {},
  ): Promise<T> {
    if (!this.fetchFn) {
      throw new InternalServerErrorException(
        'Runtime hiện tại không có fetch. Hãy dùng Node 18+',
      );
    }

    const method = options.method || 'POST';
    const headers: Record<string, string> = {
      Token: this.getToken(),
      'Content-Type': 'application/json',
    };

    if (options.includeShopIdHeader) {
      headers.ShopId = String(this.getShopId());
    }

    const response = await this.fetchFn(`${this.getBaseUrl()}${path}`, {
      method,
      headers,
      body:
        method === 'GET' || options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
    });

    const rawText = await response.text();
    let json: any = null;

    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      json = { raw: rawText };
    }

    if (!response.ok) {
      throw new BadRequestException(
        json?.message || `GHN request failed: ${response.status}`,
      );
    }

    if (json && typeof json.code !== 'undefined' && json.code !== 200) {
      throw new BadRequestException(json.message || 'GHN trả về lỗi');
    }

    return (json?.data ?? json) as T;
  }

  async getProvinces() {
    return this.request('/master-data/province');
  }

  async getDistricts(provinceId: number) {
    return this.request('/master-data/district', {
      body: { province_id: provinceId },
    });
  }

  async getWards(districtId: number) {
    return this.request('/master-data/ward', {
      body: { district_id: districtId },
    });
  }

  async getAvailableServices(toDistrictId: number, fromDistrictId?: number) {
    return this.request('/v2/shipping-order/available-services', {
      body: {
        shop_id: this.getShopId(),
        from_district: fromDistrictId || this.getFromConfig().districtId,
        to_district: toDistrictId,
      },
    });
  }

  async calculateFee(payload: any) {
    return this.request('/v2/shipping-order/fee', {
      body: payload,
      includeShopIdHeader: true,
    });
  }

  async createOrder(payload: any) {
    return this.request('/v2/shipping-order/create', {
      body: payload,
      includeShopIdHeader: true,
    });
  }

  async getOrderDetail(orderCode: string) {
    return this.request('/v2/shipping-order/detail', {
      body: { order_code: orderCode },
    });
  }

  async getOrderDetailByClientCode(clientOrderCode: string) {
    return this.request('/v2/shipping-order/detail-by-client-code', {
      body: { client_order_code: clientOrderCode },
    });
  }

  async updateCod(orderCode: string, codAmount: number) {
    return this.request('/v2/shipping-order/updateCOD', {
      body: {
        order_code: orderCode,
        cod_amount: codAmount,
      },
    });
  }

  async cancelOrder(orderCode: string) {
    return this.request('/v2/switch-status/cancel', {
      body: {
        order_codes: [orderCode],
      },
      includeShopIdHeader: true,
    });
  }
}
