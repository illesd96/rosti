import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createProductTypesWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
  uploadFilesWorkflow,
} from '@medusajs/medusa/core-flows';
import {
  ExecArgs,
  IFulfillmentModuleService,
  ISalesChannelModuleService,
  IStoreModuleService,
} from '@medusajs/framework/types';
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from '@medusajs/framework/utils';
import type FashionModuleService from '../modules/fashion/service';
import type { MaterialModelType } from '../modules/fashion/models/material';

async function getImageUrlContent(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image "${url}": ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  return Buffer.from(arrayBuffer).toString('binary');
}

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const remoteLink = container.resolve(ContainerRegistrationKeys.LINK);
  const fulfillmentModuleService: IFulfillmentModuleService = container.resolve(
    Modules.FULFILLMENT,
  );
  const salesChannelModuleService: ISalesChannelModuleService =
    container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService: IStoreModuleService = container.resolve(
    Modules.STORE,
  );
  const fashionModuleService: FashionModuleService = container.resolve(
    'fashionModuleService',
  );

  const countries = ['hr', 'gb', 'de', 'dk', 'se', 'fr', 'es', 'it'];

  logger.info('Seeding store data...');
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: 'Default Sales Channel',
  });

  if (!defaultSalesChannel.length) {
    // create the default sales channel
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container,
    ).run({
      input: {
        salesChannelsData: [
          {
            name: 'Default Sales Channel',
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  logger.info('Seeding region data...');
  
  // Check if regions already exist
  const existingRegions = await container.resolve(Modules.REGION).listRegions();
  
  let region;
  if (existingRegions.length === 0) {
    const { result: regionResult } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: 'Europe',
            currency_code: 'eur',
            countries,
            payment_providers: [],
          },
        ],
      },
    });
    region = regionResult[0];
    logger.info('Created new region.');
  } else {
    region = existingRegions[0];
    logger.info('Using existing region.');
  }
  logger.info('Finished seeding regions.');

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [
          {
            currency_code: 'eur',
            is_default: true,
          },
          {
            currency_code: 'usd',
          },
        ],
        default_sales_channel_id: defaultSalesChannel[0].id,
        default_region_id: region.id,
      },
    },
  });

  logger.info('Seeding tax regions...');
  
  // Check if tax regions already exist
  const existingTaxRegions = await container.resolve(Modules.TAX).listTaxRegions();
  
  if (existingTaxRegions.length === 0) {
    await createTaxRegionsWorkflow(container).run({
      input: countries.map((country_code) => ({
        country_code,
      })),
    });
    logger.info('Created new tax regions.');
  } else {
    logger.info('Tax regions already exist, skipping.');
  }
  logger.info('Finished seeding tax regions.');

  logger.info('Seeding stock location data...');
  
  // Check if stock locations already exist
  const existingStockLocations = await container.resolve(Modules.STOCK_LOCATION).listStockLocations({});
  
  let stockLocation;
  if (existingStockLocations.length === 0) {
    const { result: stockLocationResult } = await createStockLocationsWorkflow(
      container,
    ).run({
      input: {
        locations: [
          {
            name: 'European Warehouse',
            address: {
              city: 'Copenhagen',
              country_code: 'DK',
              address_1: '',
            },
          },
        ],
      },
    });
    stockLocation = stockLocationResult[0];
    logger.info('Created new stock location.');
  } else {
    stockLocation = existingStockLocations[0];
    logger.info('Using existing stock location.');
  }

  await remoteLink.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: 'manual_manual',
    },
  });

  logger.info('Seeding fulfillment data...');
  
  // Check if shipping profiles already exist
  const existingShippingProfiles = await container.resolve(Modules.FULFILLMENT).listShippingProfiles();
  
  let shippingProfile;
  if (existingShippingProfiles.length === 0) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: 'Default',
              type: 'default',
            },
          ],
        },
      });
    shippingProfile = shippingProfileResult[0];
    logger.info('Created new shipping profile.');
  } else {
    shippingProfile = existingShippingProfiles[0];
    logger.info('Using existing shipping profile.');
  }

  // Check if fulfillment sets already exist
  const existingFulfillmentSets = await fulfillmentModuleService.listFulfillmentSets({});
  
  let fulfillmentSet;
  if (existingFulfillmentSets.length === 0) {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: 'European Warehouse delivery',
      type: 'shipping',
      service_zones: [
        {
          name: 'Europe',
          geo_zones: [
            {
              country_code: 'hr',
              type: 'country',
            },
            {
              country_code: 'gb',
              type: 'country',
            },
            {
              country_code: 'de',
              type: 'country',
            },
            {
              country_code: 'dk',
              type: 'country',
            },
            {
              country_code: 'se',
              type: 'country',
            },
            {
              country_code: 'fr',
              type: 'country',
            },
            {
              country_code: 'es',
              type: 'country',
            },
            {
              country_code: 'it',
              type: 'country',
            },
          ],
        },
      ],
    });
    logger.info('Created new fulfillment set.');
  } else {
    fulfillmentSet = existingFulfillmentSets[0];
    logger.info('Using existing fulfillment set.');
  }

  await remoteLink.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  // Only create shipping options if fulfillment set has service zones
  if (fulfillmentSet?.service_zones?.[0]?.id) {
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: 'Standard Shipping',
          price_type: 'flat',
          provider_id: 'manual_manual',
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
        type: {
          label: 'Standard',
          description: 'Ship in 2-3 days.',
          code: 'standard',
        },
        prices: [
          {
            currency_code: 'usd',
            amount: 10,
          },
          {
            currency_code: 'eur',
            amount: 10,
          },
          {
            region_id: region.id,
            amount: 10,
          },
        ],
        rules: [
          {
            attribute: 'enabled_in_store',
            value: '"true"',
            operator: 'eq',
          },
          {
            attribute: 'is_return',
            value: 'false',
            operator: 'eq',
          },
        ],
      },
      {
        name: 'Express Shipping',
        price_type: 'flat',
        provider_id: 'manual_manual',
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: 'Express',
            description: 'Ship in 24 hours.',
            code: 'express',
          },
          prices: [
            {
              currency_code: 'usd',
              amount: 10,
            },
            {
              currency_code: 'eur',
              amount: 10,
            },
            {
              region_id: region.id,
              amount: 10,
            },
          ],
          rules: [
            {
              attribute: 'enabled_in_store',
              value: '"true"',
              operator: 'eq',
            },
            {
              attribute: 'is_return',
              value: 'false',
              operator: 'eq',
            },
          ],
        },
      ],
    });
  } else {
    logger.info('Skipping shipping options creation - no service zones available.');
  }

  // Check if pickup fulfillment set already exists
  let pickupFulfillmentSet;
  const currentFulfillmentSets = await fulfillmentModuleService.listFulfillmentSets({});
  const existingPickupFulfillmentSets = currentFulfillmentSets.filter(fs => fs.name === 'Store pickup');
  
  if (existingPickupFulfillmentSets.length === 0) {
    pickupFulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: 'Store pickup',
      type: 'pickup',
      service_zones: [
        {
          name: 'Store pickup',
          geo_zones: [
            {
              country_code: 'hr',
              type: 'country',
            },
            {
              country_code: 'dk',
              type: 'country',
            },
          ],
        },
      ],
    });
    logger.info('Created new pickup fulfillment set.');
  } else {
    pickupFulfillmentSet = existingPickupFulfillmentSets[0];
    logger.info('Using existing pickup fulfillment set.');
  }

  await remoteLink.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: pickupFulfillmentSet.id,
    },
  });

  // Only create pickup shipping options if pickup fulfillment set has service zones
  if (pickupFulfillmentSet?.service_zones?.[0]?.id) {
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: 'Denmark Store Pickup',
          price_type: 'flat',
          provider_id: 'manual_manual',
          service_zone_id: pickupFulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
        type: {
          label: 'Denmark Store Pickup',
          description: 'Free in-store pickup.',
          code: 'standard',
        },
        prices: [
          {
            currency_code: 'usd',
            amount: 0,
          },
          {
            currency_code: 'eur',
            amount: 0,
          },
          {
            region_id: region.id,
            amount: 0,
          },
        ],
        rules: [
          {
            attribute: 'enabled_in_store',
            value: '"true"',
            operator: 'eq',
          },
          {
            attribute: 'is_return',
            value: 'false',
            operator: 'eq',
          },
        ],
      },
    ],
  });
  } else {
    logger.info('Skipping pickup shipping options creation - no service zones available.');
  }

  logger.info('Finished seeding fulfillment data.');

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info('Finished seeding stock location data.');

  logger.info('Seeding publishable API key data...');
  
  // Check if API keys already exist
  const existingApiKeys = await container.resolve(Modules.API_KEY).listApiKeys({});
  
  let publishableApiKey;
  if (existingApiKeys.length === 0) {
    const { result: publishableApiKeyResult } = await createApiKeysWorkflow(
      container,
    ).run({
      input: {
        api_keys: [
          {
            title: 'Webshop',
            type: 'publishable',
            created_by: '',
          },
        ],
      },
    });
    publishableApiKey = publishableApiKeyResult[0];
    logger.info('Created new API key.');
  } else {
    publishableApiKey = existingApiKeys[0];
    logger.info('Using existing API key.');
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info('Finished seeding publishable API key data.');

  logger.info('Seeding product data...');

  // Check if product categories already exist
  const existingCategories = await container.resolve(Modules.PRODUCT).listProductCategories({});
  
  let categoryResult;
  if (existingCategories.length === 0) {
    categoryResult = await createProductCategoriesWorkflow(
      container,
    ).run({
      input: {
        product_categories: [
          {
            name: 'One seater',
            is_active: true,
          },
          {
            name: 'Two seater',
            is_active: true,
          },
          {
            name: 'Three seater',
            is_active: true,
          },
        ],
      },
    });
    logger.info('Created new product categories.');
  } else {
    categoryResult = { result: existingCategories };
    logger.info('Using existing product categories.');
  }

  const [sofasImage, armChairsImage] = await uploadFilesWorkflow(container)
    .run({
      input: {
        files: [
          {
            access: 'public',
            filename: 'sofas.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/product-types/sofas/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'arm-chairs.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/product-types/arm-chairs/image.png',
            ),
          },
        ],
      },
    })
    .then((res) => res.result);

  // Check if product types already exist
  const existingProductTypes = await container.resolve(Modules.PRODUCT).listProductTypes({});
  
  let productTypes;
  if (existingProductTypes.length === 0) {
    productTypes = await createProductTypesWorkflow(
      container,
    ).run({
      input: {
        product_types: [
          {
            value: 'Sofas',
            metadata: {
              image: sofasImage,
            },
          },
          {
            value: 'Arm Chairs',
            metadata: {
              image: armChairsImage,
            },
          },
        ],
      },
    });
    logger.info('Created new product types.');
  } else {
    productTypes = { result: existingProductTypes };
    logger.info('Using existing product types.');
  }

  const [
    scandinavianSimplicityImage,
    scandinavianSimplicityCollectionPageImage,
    scandinavianSimplicityProductPageImage,
    scandinavianSimplicityProductPageWideImage,
    scandinavianSimplicityProductPageCtaImage,
    modernLuxeImage,
    modernLuxeCollectionPageImage,
    modernLuxeProductPageImage,
    modernLuxeProductPageWideImage,
    modernLuxeProductPageCtaImage,
    bohoChicImage,
    bohoChicCollectionPageImage,
    bohoChicProductPageImage,
    bohoChicProductPageWideImage,
    bohoChicProductPageCtaImage,
    timelessClassicsImage,
    timelessClassicsCollectionPageImage,
    timelessClassicsProductPageImage,
    timelessClassicsProductPageWideImage,
    timelessClassicsProductPageCtaImage,
  ] = await uploadFilesWorkflow(container)
    .run({
      input: {
        files: [
          {
            access: 'public',
            filename: 'scandinavian-simplicity.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/scandinavian-simplicity/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'scandinavian-simplicity-collection-page-image.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/scandinavian-simplicity/collection_page_image.png',
            ),
          },
          {
            access: 'public',
            filename: 'scandinavian-simplicity-product-page-image.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/scandinavian-simplicity/product_page_image.png',
            ),
          },
          {
            access: 'public',
            filename: 'scandinavian-simplicity-product-page-wide-image.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/scandinavian-simplicity/product_page_wide_image.png',
            ),
          },
          {
            access: 'public',
            filename: 'scandinavian-simplicity-product-page-cta-image.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/scandinavian-simplicity/product_page_cta_image.png',
            ),
          },
          {
            access: 'public',
            filename: 'modern-luxe.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/modern-luxe/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'modern-luxe-collection-page-image.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/modern-luxe/collection_page_image.png',
            ),
          },
          {
            access: 'public',
            filename: 'modern-luxe-product-page-image.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/modern-luxe/product_page_image.png',
            ),
          },
          {
            access: 'public',
            filename: 'modern-luxe-product-page-wide-image.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/modern-luxe/product_page_wide_image.png',
            ),
          },
          {
            access: 'public',
            filename: 'modern-luxe-product-page-cta-image.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/modern-luxe/product_page_cta_image.png',
            ),
          },
          {
            access: 'public',
            filename: 'boho-chic.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/boho-chic/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'boho-chic-collection-page-image.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/boho-chic/collection_page_image.png',
            ),
          },
          {
            access: 'public',
            filename: 'boho-chic-product-page-image.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/boho-chic/product_page_image.png',
            ),
          },
          {
            access: 'public',
            filename: 'boho-chic-product-page-wide-image.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/boho-chic/product_page_wide_image.png',
            ),
          },
          {
            access: 'public',
            filename: 'boho-chic-product-page-cta-image.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/boho-chic/product_page_cta_image.png',
            ),
          },
          {
            access: 'public',
            filename: 'timeless-classics.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/timeless-classics/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'timeless-classics-collection-page-image.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/timeless-classics/collection_page_image.png',
            ),
          },
          {
            access: 'public',
            filename: 'timeless-classics-product-page-image.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/timeless-classics/product_page_image.png',
            ),
          },
          {
            access: 'public',
            filename: 'timeless-classics-product-page-wide-image.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/timeless-classics/product_page_wide_image.png',
            ),
          },
          {
            access: 'public',
            filename: 'timeless-classics-product-page-cta-image.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/collections/timeless-classics/product_page_cta_image.png',
            ),
          },
        ],
      },
    })
    .then((res) => res.result);

  // Create collections with error handling for existing collections
  let collections;
  try {
    const { result: collectionsResult } = await createCollectionsWorkflow(
      container,
    ).run({
    input: {
      collections: [
        {
          title: 'Scandinavian Simplicity',
          handle: 'scandinavian-simplicity',
          metadata: {
            description:
              'Minimalistic designs, neutral colors, and high-quality textures',
            image: scandinavianSimplicityImage,
            collection_page_image: scandinavianSimplicityCollectionPageImage,
            collection_page_heading:
              'Scandinavian Simplicity: Effortless elegance, timeless comfort',
            collection_page_content: `Minimalistic designs, neutral colors, and high-quality textures. Perfect for those who seek comfort with a clean and understated aesthetic.

This collection brings the essence of Scandinavian elegance to your living room.`,
            product_page_heading: 'Collection Inspired Interior',
            product_page_image: scandinavianSimplicityProductPageImage,
            product_page_wide_image: scandinavianSimplicityProductPageWideImage,
            product_page_cta_image: scandinavianSimplicityProductPageCtaImage,
            product_page_cta_heading:
              "The 'Name of sofa' embodies Scandinavian minimalism with clean lines and a soft, neutral palette.",
            product_page_cta_link:
              "See more out of 'Scandinavian Simplicity' collection",
          },
        },
        {
          title: 'Modern Luxe',
          handle: 'modern-luxe',
          metadata: {
            description:
              'Sophisticated and sleek, these sofas blend modern design with luxurious comfort',
            image: modernLuxeImage,
            collection_page_image: modernLuxeCollectionPageImage,
            collection_page_heading:
              'Modern Luxe: Where modern design meets luxurious living',
            collection_page_content: `Sophisticated and sleek, these sofas blend modern design with luxurious comfort. Bold lines and premium materials create the ultimate statement pieces for any contemporary home.

Elevate your space with timeless beauty.`,
            product_page_heading: 'Collection Inspired Interior',
            product_page_image: modernLuxeProductPageImage,
            product_page_wide_image: modernLuxeProductPageWideImage,
            product_page_cta_image: modernLuxeProductPageCtaImage,
            product_page_cta_heading:
              "The 'Name of sofa' is a masterpiece of minimalism and luxury.",
            product_page_cta_link: "See more out of 'Modern Luxe' collection",
          },
        },
        {
          title: 'Boho Chic',
          handle: 'boho-chic',
          metadata: {
            description:
              'Infused with playful textures and vibrant patterns with eclectic vibes',
            image: bohoChicImage,
            collection_page_image: bohoChicCollectionPageImage,
            collection_page_heading:
              'Boho Chic: Relaxed, eclectic style with a touch of free-spirited charm',
            collection_page_content: `Infused with playful textures and vibrant patterns, this collection embodies relaxed, eclectic vibes. Soft fabrics and creative designs add warmth and personality to any room.

It\'s comfort with a bold, carefree spirit.`,
            product_page_heading: 'Collection Inspired Interior',
            product_page_image: bohoChicProductPageImage,
            product_page_wide_image: bohoChicProductPageWideImage,
            product_page_cta_image: bohoChicProductPageCtaImage,
            product_page_cta_heading:
              "The 'Name of sofa' captures the essence of boho style with its relaxed, oversized form and eclectic fabric choices.",
            product_page_cta_link: "See more out of 'Boho Chic' collection",
          },
        },
        {
          title: 'Timeless Classics',
          handle: 'timeless-classics',
          metadata: {
            description:
              'Elegant shapes and rich textures, traditional craftsmanship with modern comfort',
            image: timelessClassicsImage,
            collection_page_image: timelessClassicsCollectionPageImage,
            collection_page_heading:
              'Timeless Classics: Enduring style, crafted for comfort and lasting beauty',
            collection_page_content: `Designed for those who appreciate enduring style, this collection features elegant shapes and rich textures. These sofas combine traditional craftsmanship with modern comfort.

Perfect for creating a warm, inviting atmosphere that never goes out of style.`,
            product_page_heading: 'Collection Inspired Interior',
            product_page_image: timelessClassicsProductPageImage,
            product_page_wide_image: timelessClassicsProductPageWideImage,
            product_page_cta_image: timelessClassicsProductPageCtaImage,
            product_page_cta_heading:
              "The 'Name of sofa' brings a touch of traditional charm with its elegant curves and classic silhouette",
            product_page_cta_link:
              "See more out of 'Timeless Classics' collection",
          },
        },
      ],
    },
  });
    collections = collectionsResult;
    logger.info('Created new collections.');
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      logger.info('Collections already exist, skipping creation.');
      // Skip collections for now - products will be created without collection association
      collections = [];
    } else {
      throw error;
    }
  }

  // Check if materials already exist
  const existingMaterials = await fashionModuleService.listMaterials();
  
  let materials: MaterialModelType[];
  if (existingMaterials.length === 0) {
    materials = await fashionModuleService.createMaterials([
      {
        name: 'Velvet',
      },
      {
        name: 'Linen',
      },
      {
        name: 'Boucle',
      },
      {
        name: 'Leather',
      },
      {
        name: 'Microfiber',
      },
    ]);
    logger.info('Created new materials.');
  } else {
    materials = existingMaterials;
    logger.info('Using existing materials.');
  }

  // Check if colors already exist
  const existingColors = await fashionModuleService.listColors();
  
  if (existingColors.length === 0) {
    await fashionModuleService.createColors([
    // Velvet
    {
      name: 'Black',
      hex_code: '#4C4D4E',
      material_id: materials.find((m) => m.name === 'Velvet').id,
    },
    {
      name: 'Purple',
      hex_code: '#904C94',
      material_id: materials.find((m) => m.name === 'Velvet').id,
    },
    // Linen
    {
      name: 'Green',
      hex_code: '#438849',
      material_id: materials.find((m) => m.name === 'Linen').id,
    },
    {
      name: 'Light Gray',
      hex_code: '#B1B1B1',
      material_id: materials.find((m) => m.name === 'Linen').id,
    },
    {
      name: 'Yellow',
      hex_code: '#F1BD37',
      material_id: materials.find((m) => m.name === 'Linen').id,
    },
    {
      name: 'Red',
      hex_code: '#CD1F23',
      material_id: materials.find((m) => m.name === 'Linen').id,
    },
    {
      name: 'Blue',
      hex_code: '#475F8A',
      material_id: materials.find((m) => m.name === 'Linen').id,
    },
    // Microfiber
    {
      name: 'Orange',
      hex_code: '#EF7218',
      material_id: materials.find((m) => m.name === 'Microfiber').id,
    },
    {
      name: 'Dark Gray',
      hex_code: '#4A4A4A',
      material_id: materials.find((m) => m.name === 'Microfiber').id,
    },
    {
      name: 'Black',
      hex_code: '#282828',
      material_id: materials.find((m) => m.name === 'Microfiber').id,
    },
    // Boucle
    {
      name: 'Beige',
      hex_code: '#C8BCB3',
      material_id: materials.find((m) => m.name === 'Boucle').id,
    },
    {
      name: 'White',
      hex_code: '#EAEAEA',
      material_id: materials.find((m) => m.name === 'Boucle').id,
    },
    {
      name: 'Light Gray',
      hex_code: '#C3C0BE',
      material_id: materials.find((m) => m.name === 'Boucle').id,
    },
    // Leather
    {
      name: 'Violet',
      hex_code: '#B1ABBF',
      material_id: materials.find((m) => m.name === 'Leather').id,
    },
    {
      name: 'Beige',
      hex_code: '#A79D9B',
      material_id: materials.find((m) => m.name === 'Leather').id,
    },
  ]);
    logger.info('Created new colors.');
  } else {
    logger.info('Colors already exist, skipping.');
  }

  // Check if products already exist
  const existingProducts = await container.resolve(Modules.PRODUCT).listProducts({});
  
  if (existingProducts.length === 0) {
    const astridCurveImages = await uploadFilesWorkflow(container)
      .run({
        input: {
          files: [
            {
              access: 'public',
              filename: 'astrid-curve.png',
              mimeType: 'image/png',
              content: await getImageUrlContent(
                'https://assets.agilo.com/fashion-starter/products/astrid-curve/image.png',
              ),
            },
            {
              access: 'public',
              filename: 'astrid-curve-2.png',
              mimeType: 'image/png',
              content: await getImageUrlContent(
                'https://assets.agilo.com/fashion-starter/products/astrid-curve/image1.png',
              ),
            },
          ],
        },
      })
      .then((res) => res.result);

    await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: 'Astrid Curve',
          handle: 'astrid-curve',
          description:
            'The Astrid Curve combines flowing curves and cozy, textured fabric for a truly bohemian vibe. Its relaxed design adds character and comfort, perfect for eclectic living spaces with a free-spirited charm.',
          category_ids: [
            categoryResult.find((cat) => cat.name === 'Three seater').id,
          ],
          collection_id: collections.length > 0 ? collections.find((c) => c.handle === 'boho-chic')?.id : undefined,
          type_id: productTypes.find((pt) => pt.value === 'Sofas').id,
          status: ProductStatus.PUBLISHED,
          images: astridCurveImages,
          options: [
            {
              title: 'Material',
              values: ['Microfiber', 'Velvet'],
            },
            {
              title: 'Color',
              values: ['Dark Gray', 'Purple'],
            },
          ],
          variants: [
            {
              title: 'Microfiber / Dark Gray',
              sku: 'ASTRID-CURVE-MICROFIBER-DARK-GRAY',
              options: {
                Material: 'Microfiber',
                Color: 'Dark Gray',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1500,
                  currency_code: 'eur',
                },
                {
                  amount: 1700,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Velvet / Purple',
              sku: 'ASTRID-CURVE-VELVET-PURPLE',
              options: {
                Material: 'Velvet',
                Color: 'Purple',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 2000,
                  currency_code: 'eur',
                },
                {
                  amount: 2200,
                  currency_code: 'usd',
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });

  const belimeEstateImages = await uploadFilesWorkflow(container)
    .run({
      input: {
        files: [
          {
            access: 'public',
            filename: 'belime-estate.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/belime-estate/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'belime-estate-2.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/belime-estate/image1.png',
            ),
          },
        ],
      },
    })
    .then((res) => res.result);

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: 'Belime Estate',
          handle: 'belime-estate',
          description:
            'The Belime Estate exudes classic sophistication with its tufted back and rich fabric. Its luxurious look and enduring comfort make it a perfect fit for traditional, elegant interiors.',
          category_ids: [
            categoryResult.find((cat) => cat.name === 'Two seater').id,
          ],
          collection_id: collections.length > 0 ? collections.find((c) => c.handle === 'timeless-classics')?.id : undefined,
          type_id: productTypes.find((pt) => pt.value === 'Sofas').id,
          status: ProductStatus.PUBLISHED,
          images: belimeEstateImages,
          options: [
            {
              title: 'Material',
              values: ['Linen', 'Boucle'],
            },
            {
              title: 'Color',
              values: ['Red', 'Blue', 'Beige'],
            },
          ],
          variants: [
            {
              title: 'Linen / Red',
              sku: 'BELIME-ESTATE-LINEN-RED',
              options: {
                Material: 'Linen',
                Color: 'Red',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1500,
                  currency_code: 'eur',
                },
                {
                  amount: 1700,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Linen / Blue',
              sku: 'BELIME-ESTATE-LINEN-BLUE',
              options: {
                Material: 'Linen',
                Color: 'Blue',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1500,
                  currency_code: 'eur',
                },
                {
                  amount: 1700,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Boucle / Beige',
              sku: 'BELIME-ESTATE-BOUCLE-BEIGE',
              options: {
                Material: 'Boucle',
                Color: 'Beige',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 2000,
                  currency_code: 'eur',
                },
                {
                  amount: 2200,
                  currency_code: 'usd',
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });

  const cypressRetreatImages = await uploadFilesWorkflow(container)
    .run({
      input: {
        files: [
          {
            access: 'public',
            filename: 'cypress-retreat.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/cypress-retreat/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'cypress-retreat-2.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/cypress-retreat/image1.png',
            ),
          },
        ],
      },
    })
    .then((res) => res.result);

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: 'Cypress Retreat',
          handle: 'cypress-retreat',
          description:
            'The Cypress Retreat is a nod to traditional design with its elegant lines and durable, high-quality upholstery. A timeless choice, it offers long-lasting comfort and a refined aesthetic for any home.',
          category_ids: [
            categoryResult.find((cat) => cat.name === 'Three seater').id,
          ],
          collection_id: collections.length > 0 ? collections.find((c) => c.handle === 'timeless-classics')?.id : undefined,
          type_id: productTypes.find((pt) => pt.value === 'Sofas').id,
          status: ProductStatus.PUBLISHED,
          images: cypressRetreatImages,
          options: [
            {
              title: 'Material',
              values: ['Leather'],
            },
            {
              title: 'Color',
              values: ['Beige', 'Violet'],
            },
          ],
          variants: [
            {
              title: 'Leather / Beige',
              sku: 'CYPRESS-RETREAT-LEATHER-BEIGE',
              options: {
                Material: 'Leather',
                Color: 'Beige',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1500,
                  currency_code: 'eur',
                },
                {
                  amount: 1700,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Leather / Violet',
              sku: 'CYPRESS-RETREAT-LEATHER-VIOLET',
              options: {
                Material: 'Leather',
                Color: 'Violet',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 2000,
                  currency_code: 'eur',
                },
                {
                  amount: 2200,
                  currency_code: 'usd',
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });

  const everlyEstateImages = await uploadFilesWorkflow(container)
    .run({
      input: {
        files: [
          {
            access: 'public',
            filename: 'everly-estate.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/everly-estate/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'everly-estate-2.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/everly-estate/image1.png',
            ),
          },
        ],
      },
    })
    .then((res) => res.result);

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: 'Everly Estate',
          handle: 'everly-estate',
          description:
            'The Everly Estate offers a blend of modern elegance and plush luxury, with its sleek lines and soft velvet upholstery. Perfect for upscale interiors, it exudes sophistication and comfort in equal measure.',
          category_ids: [
            categoryResult.find((cat) => cat.name === 'Two seater').id,
          ],
          collection_id: collections.length > 0 ? collections.find((c) => c.handle === 'modern-luxe')?.id : undefined,
          type_id: productTypes.find((pt) => pt.value === 'Sofas').id,
          status: ProductStatus.PUBLISHED,
          images: everlyEstateImages,
          options: [
            {
              title: 'Material',
              values: ['Microfiber', 'Velvet'],
            },
            {
              title: 'Color',
              values: ['Orange', 'Black'],
            },
          ],
          variants: [
            {
              title: 'Microfiber / Orange',
              sku: 'EVERLY-ESTATE-MICROFIBER-ORANGE',
              options: {
                Material: 'Microfiber',
                Color: 'Orange',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1500,
                  currency_code: 'eur',
                },
                {
                  amount: 1700,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Velvet / Black',
              sku: 'EVERLY-ESTATE-VELVET-BLACK',
              options: {
                Material: 'Velvet',
                Color: 'Black',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 2000,
                  currency_code: 'eur',
                },
                {
                  amount: 2200,
                  currency_code: 'usd',
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });

  const havenhillEstateImages = await uploadFilesWorkflow(container)
    .run({
      input: {
        files: [
          {
            access: 'public',
            filename: 'havenhill-estate.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/havenhill-estate/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'havenhill-estate-2.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/havenhill-estate/image1.png',
            ),
          },
        ],
      },
    })
    .then((res) => res.result);

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: 'Havenhill Estate',
          handle: 'havenhill-estate',
          description:
            'The Havenhill Estate brings a touch of traditional charm with its elegant curves and classic silhouette. Upholstered in durable, luxurious fabric, it\'s a timeless piece that combines comfort and style, fitting seamlessly into any sophisticated home.',
          category_ids: [
            categoryResult.find((cat) => cat.name === 'One seater').id,
          ],
          collection_id: collections.length > 0 ? collections.find((c) => c.handle === 'timeless-classics')?.id : undefined,
          type_id: productTypes.find((pt) => pt.value === 'Arm Chairs').id,
          status: ProductStatus.PUBLISHED,
          images: havenhillEstateImages,
          options: [
            {
              title: 'Material',
              values: ['Linen', 'Boucle'],
            },
            {
              title: 'Color',
              values: ['Green', 'Light Gray', 'Yellow'],
            },
          ],
          variants: [
            {
              title: 'Linen / Green',
              sku: 'HAVENHILL-ESTATE-LINEN-GREEN',
              options: {
                Material: 'Linen',
                Color: 'Green',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1000,
                  currency_code: 'eur',
                },
                {
                  amount: 1200,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Boucle / Light Gray',
              sku: 'HAVENHILL-ESTATE-BOUCLE-LIGHT-GRAY',
              options: {
                Material: 'Boucle',
                Color: 'Light Gray',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1200,
                  currency_code: 'eur',
                },
                {
                  amount: 1400,
                  currency_code: 'usd',
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });

  const monacoFlairImages = await uploadFilesWorkflow(container)
    .run({
      input: {
        files: [
          {
            access: 'public',
            filename: 'monaco-flair.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/monaco-flair/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'monaco-flair-2.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/monaco-flair/image1.png',
            ),
          },
        ],
      },
    })
    .then((res) => res.result);

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: 'Monaco Flair',
          handle: 'monaco-flair',
          description:
            'The Monaco Flair combines sleek metallic accents with rich fabric, delivering a bold, luxurious statement. Its minimalist design and deep seating make it a standout piece for modern living rooms.',
          category_ids: [
            categoryResult.find((cat) => cat.name === 'Three seater').id,
          ],
          collection_id: collections.length > 0 ? collections.find((c) => c.handle === 'modern-luxe')?.id : undefined,
          type_id: productTypes.find((pt) => pt.value === 'Sofas').id,
          status: ProductStatus.PUBLISHED,
          images: monacoFlairImages,
          options: [
            {
              title: 'Material',
              values: ['Linen', 'Boucle'],
            },
            {
              title: 'Color',
              values: ['Green', 'Light Gray', 'Beige'],
            },
          ],
          variants: [
            {
              title: 'Linen / Green',
              sku: 'MONACO-FLAIR-LINEN-GREEN',
              options: {
                Material: 'Linen',
                Color: 'Green',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1500,
                  currency_code: 'eur',
                },
                {
                  amount: 1700,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Boucle / Light Gray',
              sku: 'MONACO-FLAIR-BOUCLE-LIGHT-GRAY',
              options: {
                Material: 'Boucle',
                Color: 'Light Gray',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 2000,
                  currency_code: 'eur',
                },
                {
                  amount: 2200,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Boucle / Beige',
              sku: 'MONACO-FLAIR-BOUCLE-BEIGE',
              options: {
                Material: 'Boucle',
                Color: 'Beige',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 2000,
                  currency_code: 'eur',
                },
                {
                  amount: 2200,
                  currency_code: 'usd',
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });

  const nordicBreezeImages = await uploadFilesWorkflow(container)
    .run({
      input: {
        files: [
          {
            access: 'public',
            filename: 'nordic-breeze.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/nordic-breeze/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'nordic-breeze-2.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/nordic-breeze/image1.png',
            ),
          },
        ],
      },
    })
    .then((res) => res.result);

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: 'Nordic Breeze',
          handle: 'nordic-breeze',
          description:
            'The Nordic Breeze is a refined expression of Scandinavian minimalism, with its crisp silhouette and airy aesthetic. Crafted for both comfort and simplicity, it\'s perfect for creating a serene living space.',
          category_ids: [
            categoryResult.find((cat) => cat.name === 'One seater').id,
          ],
          collection_id: collections.length > 0 ? collections.find((c) => c.handle === 'scandinavian-simplicity')?.id : undefined,
          type_id: productTypes.find((pt) => pt.value === 'Arm Chairs').id,
          status: ProductStatus.PUBLISHED,
          images: nordicBreezeImages,
          options: [
            {
              title: 'Material',
              values: ['Boucle', 'Linen'],
            },
            {
              title: 'Color',
              values: ['Beige', 'White', 'Light Gray'],
            },
          ],
          variants: [
            {
              title: 'Boucle / Beige',
              sku: 'NORDIC-BREEZE-BOUCLE-BEIGE',
              options: {
                Material: 'Boucle',
                Color: 'Beige',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1200,
                  currency_code: 'eur',
                },
                {
                  amount: 1400,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Boucle / White',
              sku: 'NORDIC-BREEZE-BOUCLE-WHITE',
              options: {
                Material: 'Boucle',
                Color: 'White',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1200,
                  currency_code: 'eur',
                },
                {
                  amount: 1400,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Linen / Light Gray',
              sku: 'NORDIC-BREEZE-LINEN-LIGHT-GRAY',
              options: {
                Material: 'Linen',
                Color: 'Light Gray',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1800,
                  currency_code: 'eur',
                },
                {
                  amount: 2000,
                  currency_code: 'usd',
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });

  const nordicHavenImages = await uploadFilesWorkflow(container)
    .run({
      input: {
        files: [
          {
            access: 'public',
            filename: 'nordic-haven.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/nordic-haven/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'nordic-haven-2.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/nordic-haven/image1.png',
            ),
          },
        ],
      },
    })
    .then((res) => res.result);

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: 'Nordic Haven',
          handle: 'nordic-haven',
          description:
            'The Nordic Haven features clean lines and soft textures, embodying the essence of Scandinavian design. Its natural tones and minimalist frame bring effortless serenity and comfort to any home.',
          category_ids: [
            categoryResult.find((cat) => cat.name === 'Three seater').id,
          ],
          collection_id: collections.length > 0 ? collections.find((c) => c.handle === 'scandinavian-simplicity')?.id : undefined,
          type_id: productTypes.find((pt) => pt.value === 'Sofas').id,
          status: ProductStatus.PUBLISHED,
          images: nordicHavenImages,
          options: [
            {
              title: 'Material',
              values: ['Linen', 'Boucle'],
            },
            {
              title: 'Color',
              values: ['Light Gray', 'White', 'Beige'],
            },
          ],
          variants: [
            {
              title: 'Linen / Light Gray',
              sku: 'NORDIC-HAVEN-LINEN-LIGHT-GRAY',
              options: {
                Material: 'Linen',
                Color: 'Light Gray',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1500,
                  currency_code: 'eur',
                },
                {
                  amount: 1700,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Boucle / White',
              sku: 'NORDIC-HAVEN-BOUCLE-WHITE',
              options: {
                Material: 'Boucle',
                Color: 'White',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 2000,
                  currency_code: 'eur',
                },
                {
                  amount: 2200,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Boucle / Beige',
              sku: 'NORDIC-HAVEN-BOUCLE-BEIGE',
              options: {
                Material: 'Boucle',
                Color: 'Beige',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 2000,
                  currency_code: 'eur',
                },
                {
                  amount: 2200,
                  currency_code: 'usd',
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });

  const osloDriftImages = await uploadFilesWorkflow(container)
    .run({
      input: {
        files: [
          {
            access: 'public',
            filename: 'oslo-drift.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/oslo-drift/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'oslo-drift-2.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/oslo-drift/image1.png',
            ),
          },
        ],
      },
    })
    .then((res) => res.result);

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: 'Oslo Drift',
          handle: 'oslo-drift',
          description:
            'The Oslo Drift is designed for ultimate relaxation, with soft, supportive cushions and a sleek, modern frame. Its understated elegance and neutral tones make it an ideal fit for contemporary, minimalist homes.',
          category_ids: [
            categoryResult.find((cat) => cat.name === 'Two seater').id,
          ],
          collection_id: collections.length > 0 ? collections.find((c) => c.handle === 'scandinavian-simplicity')?.id : undefined,
          type_id: productTypes.find((pt) => pt.value === 'Sofas').id,
          status: ProductStatus.PUBLISHED,
          images: osloDriftImages,
          options: [
            {
              title: 'Material',
              values: ['Boucle', 'Linen'],
            },
            {
              title: 'Color',
              values: ['White', 'Beige', 'Light Gray'],
            },
          ],
          variants: [
            {
              title: 'Boucle / White',
              sku: 'OSLO-DRIFT-BOUCLE-WHITE',
              options: {
                Material: 'Boucle',
                Color: 'White',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1500,
                  currency_code: 'eur',
                },
                {
                  amount: 1700,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Boucle / Beige',
              sku: 'OSLO-DRIFT-BOUCLE-BEIGE',
              options: {
                Material: 'Boucle',
                Color: 'Beige',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 2000,
                  currency_code: 'eur',
                },
                {
                  amount: 2200,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Linen / Light Gray',
              sku: 'OSLO-DRIFT-LINEN-LIGHT-GRAY',
              options: {
                Material: 'Linen',
                Color: 'Light Gray',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 2000,
                  currency_code: 'eur',
                },
                {
                  amount: 2200,
                  currency_code: 'usd',
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });

  const osloSerenityImages = await uploadFilesWorkflow(container)
    .run({
      input: {
        files: [
          {
            access: 'public',
            filename: 'oslo-serenity.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/oslo-serenity/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'oslo-serenity-2.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/oslo-serenity/image1.png',
            ),
          },
        ],
      },
    })
    .then((res) => res.result);

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: 'Oslo Serenity',
          handle: 'oslo-serenity',
          description:
            'The Oslo Serenity embodies Scandinavian minimalism with clean lines and a soft, neutral palette. Its tailored silhouette and plush cushions deliver a balance of simplicity and comfort, making it perfect for those who value understated elegance.',
          category_ids: [
            categoryResult.find((cat) => cat.name === 'Two seater').id,
          ],
          collection_id: collections.length > 0 ? collections.find((c) => c.handle === 'scandinavian-simplicity')?.id : undefined,
          type_id: productTypes.find((pt) => pt.value === 'Sofas').id,
          status: ProductStatus.PUBLISHED,
          images: osloSerenityImages,
          options: [
            {
              title: 'Material',
              values: ['Leather'],
            },
            {
              title: 'Color',
              values: ['Violet', 'Beige'],
            },
          ],
          variants: [
            {
              title: 'Leather / Violet',
              sku: 'OSLO-SERENITY-LEATHER-VIOLET',
              options: {
                Material: 'Leather',
                Color: 'Violet',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1500,
                  currency_code: 'eur',
                },
                {
                  amount: 1700,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Leather / Beige',
              sku: 'OSLO-SERENITY-LEATHER-BEIGE',
              options: {
                Material: 'Leather',
                Color: 'Beige',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 2000,
                  currency_code: 'eur',
                },
                {
                  amount: 2200,
                  currency_code: 'usd',
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });

  const palomaHavenImages = await uploadFilesWorkflow(container)
    .run({
      input: {
        files: [
          {
            access: 'public',
            filename: 'paloma-haven.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/paloma-haven/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'paloma-haven-2.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/paloma-haven/image1.png',
            ),
          },
        ],
      },
    })
    .then((res) => res.result);

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: 'Paloma Haven',
          handle: 'paloma-haven',
          description:
            'Minimalistic designs, neutral colors, and high-quality textures. Perfect for those who seek comfort with a clean and understated aesthetic. This collection brings the essence of Scandinavian elegance to your living room.',
          category_ids: [
            categoryResult.find((cat) => cat.name === 'One seater').id,
          ],
          collection_id: collections.length > 0 ? collections.find((c) => c.handle === 'modern-luxe')?.id : undefined,
          type_id: productTypes.find((pt) => pt.value === 'Arm Chairs').id,
          status: ProductStatus.PUBLISHED,
          images: palomaHavenImages,
          options: [
            {
              title: 'Material',
              values: ['Linen', 'Boucle'],
            },
            {
              title: 'Color',
              values: ['Light Gray', 'Green', 'Beige'],
            },
          ],
          variants: [
            {
              title: 'Linen / Light Gray',
              sku: 'PALOMA-HAVEN-LINEN-LIGHT-GRAY',
              options: {
                Material: 'Linen',
                Color: 'Light Gray',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 900,
                  currency_code: 'eur',
                },
                {
                  amount: 1100,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Linen / Green',
              sku: 'PALOMA-HAVEN-LINEN-GREEN',
              options: {
                Material: 'Linen',
                Color: 'Green',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 900,
                  currency_code: 'eur',
                },
                {
                  amount: 1100,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Boucle / Beige',
              sku: 'PALOMA-HAVEN-BOUCLE-BEIGE',
              options: {
                Material: 'Boucle',
                Color: 'Beige',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1200,
                  currency_code: 'eur',
                },
                {
                  amount: 1400,
                  currency_code: 'usd',
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });

  const savannahGroveImages = await uploadFilesWorkflow(container)
    .run({
      input: {
        files: [
          {
            access: 'public',
            filename: 'savannah-grove.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/savannah-grove/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'savannah-grove-2.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/savannah-grove/image1.png',
            ),
          },
        ],
      },
    })
    .then((res) => res.result);

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: 'Savannah Grove',
          handle: 'savannah-grove',
          description:
            'The Savannah Grove captures the essence of boho style with its relaxed, oversized form and eclectic fabric choices. Designed for both comfort and personality, it\'s the ideal piece for those who seek a cozy, free-spirited vibe in their living spaces.',
          category_ids: [
            categoryResult.find((cat) => cat.name === 'One seater').id,
          ],
          collection_id: collections.length > 0 ? collections.find((c) => c.handle === 'boho-chic')?.id : undefined,
          type_id: productTypes.find((pt) => pt.value === 'Arm Chairs').id,
          status: ProductStatus.PUBLISHED,
          images: savannahGroveImages,
          options: [
            {
              title: 'Material',
              values: ['Boucle', 'Linen'],
            },
            {
              title: 'Color',
              values: ['Light Gray', 'Yellow'],
            },
          ],
          variants: [
            {
              title: 'Boucle / Light Gray',
              sku: 'SAVANNAH-GROVE-BOUCLE-LIGHT-GRAY',
              options: {
                Material: 'Boucle',
                Color: 'Light Gray',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1200,
                  currency_code: 'eur',
                },
                {
                  amount: 1400,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Linen / Yellow',
              sku: 'SAVANNAH-GROVE-LINEN-YELLOW',
              options: {
                Material: 'Linen',
                Color: 'Yellow',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 900,
                  currency_code: 'eur',
                },
                {
                  amount: 1100,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Linen / Light Gray',
              sku: 'SAVANNAH-GROVE-LINEN-LIGHT-GRAY',
              options: {
                Material: 'Linen',
                Color: 'Light Gray',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 900,
                  currency_code: 'eur',
                },
                {
                  amount: 1100,
                  currency_code: 'usd',
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });

  const serenaMeadowImages = await uploadFilesWorkflow(container)
    .run({
      input: {
        files: [
          {
            access: 'public',
            filename: 'serena-meadow.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/serena-meadow/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'serena-meadow-2.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/serena-meadow/image1.png',
            ),
          },
        ],
      },
    })
    .then((res) => res.result);

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: 'Serena Meadow',
          handle: 'serena-meadow',
          description:
            'The Serena Meadow combines a classic silhouette with modern comfort, offering a relaxed yet polished look. Its soft upholstery and subtle curves bring a timeless elegance to any living room.',
          category_ids: [
            categoryResult.find((cat) => cat.name === 'Two seater').id,
          ],
          collection_id: collections.length > 0 ? collections.find((c) => c.handle === 'timeless-classics')?.id : undefined,
          type_id: productTypes.find((pt) => pt.value === 'Sofas').id,
          status: ProductStatus.PUBLISHED,
          images: serenaMeadowImages,
          options: [
            {
              title: 'Material',
              values: ['Microfiber', 'Velvet'],
            },
            {
              title: 'Color',
              values: ['Black', 'Dark Gray'],
            },
          ],
          variants: [
            {
              title: 'Microfiber / Black',
              sku: 'SERENA-MEADOW-MICROFIBER-BLACK',
              options: {
                Material: 'Microfiber',
                Color: 'Black',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1500,
                  currency_code: 'eur',
                },
                {
                  amount: 1700,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Microfiber / Dark Gray',
              sku: 'SERENA-MEADOW-MICROFIBER-DARK-GRAY',
              options: {
                Material: 'Microfiber',
                Color: 'Dark Gray',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 2000,
                  currency_code: 'eur',
                },
                {
                  amount: 2200,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Velvet / Black',
              sku: 'SERENA-MEADOW-VELVET-BLACK',
              options: {
                Material: 'Velvet',
                Color: 'Black',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 2000,
                  currency_code: 'eur',
                },
                {
                  amount: 2200,
                  currency_code: 'usd',
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });

  const suttonRoyaleImages = await uploadFilesWorkflow(container)
    .run({
      input: {
        files: [
          {
            access: 'public',
            filename: 'sutton-royale.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/sutton-royale/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'sutton-royale-2.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/sutton-royale/image1.png',
            ),
          },
        ],
      },
    })
    .then((res) => res.result);

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: 'Sutton Royale',
          handle: 'sutton-royale',
          description:
            'The Sutton Royale blends eclectic design with classic bohemian comfort, featuring soft, tufted fabric and a wide, welcoming frame. Its unique style adds a touch of vintage flair to any space.',
          category_ids: [
            categoryResult.find((cat) => cat.name === 'Two seater').id,
          ],
          collection_id: collections.length > 0 ? collections.find((c) => c.handle === 'boho-chic')?.id : undefined,
          type_id: productTypes.find((pt) => pt.value === 'Sofas').id,
          status: ProductStatus.PUBLISHED,
          images: suttonRoyaleImages,
          options: [
            {
              title: 'Material',
              values: ['Velvet', 'Microfiber'],
            },
            {
              title: 'Color',
              values: ['Purple', 'Dark Gray'],
            },
          ],
          variants: [
            {
              title: 'Velvet / Purple',
              sku: 'SUTTON-ROYALE-VELVET-PURPLE',
              options: {
                Material: 'Velvet',
                Color: 'Purple',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1500,
                  currency_code: 'eur',
                },
                {
                  amount: 1700,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Microfiber / Dark Gray',
              sku: 'SUTTON-ROYALE-MICROFIBER-DARK-GRAY',
              options: {
                Material: 'Microfiber',
                Color: 'Dark Gray',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 2000,
                  currency_code: 'eur',
                },
                {
                  amount: 2200,
                  currency_code: 'usd',
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });

  const velarLoftImages = await uploadFilesWorkflow(container)
    .run({
      input: {
        files: [
          {
            access: 'public',
            filename: 'velar-loft.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/velar-loft/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'velar-loft-2.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/velar-loft/image1.png',
            ),
          },
        ],
      },
    })
    .then((res) => res.result);

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: 'Velar Loft',
          handle: 'velar-loft',
          description:
            'The Velar Loft offers a refined blend of modern design and opulent comfort. Upholstered in rich fabric with sleek metallic accents, this sofa delivers both luxury and a contemporary edge, making it a striking centerpiece for sophisticated interiors.',
          category_ids: [
            categoryResult.find((cat) => cat.name === 'One seater').id,
          ],
          collection_id: collections.length > 0 ? collections.find((c) => c.handle === 'modern-luxe')?.id : undefined,
          type_id: productTypes.find((pt) => pt.value === 'Arm Chairs').id,
          status: ProductStatus.PUBLISHED,
          images: velarLoftImages,
          options: [
            {
              title: 'Material',
              values: ['Velvet', 'Microfiber'],
            },
            {
              title: 'Color',
              values: ['Black', 'Orange'],
            },
          ],
          variants: [
            {
              title: 'Velvet / Black',
              sku: 'VELAR-LOFT-VELVET-BLACK',
              options: {
                Material: 'Velvet',
                Color: 'Black',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1300,
                  currency_code: 'eur',
                },
                {
                  amount: 1500,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Microfiber / Orange',
              sku: 'VELAR-LOFT-MICROFIBER-ORANGE',
              options: {
                Material: 'Microfiber',
                Color: 'Orange',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1100,
                  currency_code: 'eur',
                },
                {
                  amount: 1300,
                  currency_code: 'usd',
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });

  const veloraLuxeImages = await uploadFilesWorkflow(container)
    .run({
      input: {
        files: [
          {
            access: 'public',
            filename: 'velora-luxe.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/velora-luxe/image.png',
            ),
          },
          {
            access: 'public',
            filename: 'velora-luxe-2.png',
            mimeType: 'image/png',
            content: await getImageUrlContent(
              'https://assets.agilo.com/fashion-starter/products/velora-luxe/image1.png',
            ),
          },
        ],
      },
    })
    .then((res) => res.result);

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: 'Velora Luxe',
          handle: 'velora-luxe',
          description:
            'The Velora Luxe brings a touch of luxury to bohemian design with its bold patterns and plush comfort. Its oversized shape and inviting cushions make it an ideal centerpiece for laid-back, stylish interiors.',
          category_ids: [
            categoryResult.find((cat) => cat.name === 'Three seater').id,
          ],
          collection_id: collections.length > 0 ? collections.find((c) => c.handle === 'boho-chic')?.id : undefined,
          type_id: productTypes.find((pt) => pt.value === 'Sofas').id,
          status: ProductStatus.PUBLISHED,
          images: veloraLuxeImages,
          options: [
            {
              title: 'Material',
              values: ['Linen', 'Boucle'],
            },
            {
              title: 'Color',
              values: ['Yellow', 'Light Gray'],
            },
          ],
          variants: [
            {
              title: 'Linen / Yellow',
              sku: 'VELORA-LUXE-LINEN-YELLOW',
              options: {
                Material: 'Linen',
                Color: 'Yellow',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 1500,
                  currency_code: 'eur',
                },
                {
                  amount: 1700,
                  currency_code: 'usd',
                },
              ],
            },
            {
              title: 'Boucle / Light Gray',
              sku: 'VELORA-LUXE-BOUCLE-LIGHT-GRAY',
              options: {
                Material: 'Boucle',
                Color: 'Light Gray',
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 2000,
                  currency_code: 'eur',
                },
                {
                  amount: 2200,
                  currency_code: 'usd',
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });
    logger.info('Created new products.');
  } else {
    logger.info('Products already exist, skipping product creation.');
  }

  logger.info('Finished seeding product data.');
}
