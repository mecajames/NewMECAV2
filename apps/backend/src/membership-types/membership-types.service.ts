import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { MembershipType } from './membership-type.entity';

@Injectable()
export class MembershipTypesService {
  constructor(private readonly em: EntityManager) {}

  async findAll() {
    return this.em.find(MembershipType, {});
  }

  async findById(id: string) {
    return this.em.findOne(MembershipType, { id });
  }

  async findByName(name: string) {
    return this.em.findOne(MembershipType, { name });
  }

  async create(data: Partial<MembershipType>) {
    const membershipType = this.em.create(MembershipType, data);
    await this.em.persistAndFlush(membershipType);
    return membershipType;
  }

  async update(id: string, data: Partial<MembershipType>) {
    const membershipType = await this.em.findOneOrFail(MembershipType, { id });
    this.em.assign(membershipType, data);
    await this.em.flush();
    return membershipType;
  }

  async delete(id: string) {
    const membershipType = await this.em.findOneOrFail(MembershipType, { id });
    await this.em.removeAndFlush(membershipType);
  }

  async updateFeatures(id: string, features: any) {
    const membershipType = await this.em.findOneOrFail(MembershipType, { id });
    membershipType.features = { ...membershipType.features, ...features };
    await this.em.flush();
    return membershipType;
  }

  async getActiveTypes() {
    return this.em.find(MembershipType, { isActive: true });
  }
}
